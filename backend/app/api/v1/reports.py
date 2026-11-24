from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import assert_location_access, require_roles
from app.models.inventory import InventoryBatch, StockStatus
from app.models.location import Location, LocationType
from app.models.product import Product
from app.models.purchasing import PurchaseOrder, PurchaseOrderStatus
from app.models.sales import Sale, SaleItem, SaleStatus
from app.models.supplier import Supplier
from app.models.transfer import StockTransfer, TransferStatus
from app.models.user import User, UserRole
from app.schemas.reports import (
    BranchPerformanceRow,
    DashboardSummary,
    ExpiryAlertItem,
    LowStockItem,
)

router = APIRouter(prefix="/reports", tags=["Dashboard & Reports"])

REPORT_ROLES = (
    UserRole.OWNER,
    UserRole.HEAD_OFFICE_MANAGER,
    UserRole.BRANCH_MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.INVENTORY_OFFICER,
)


def _allowed_location_ids(user: User, location_id: int | None) -> list[int] | None:
    if location_id is not None:
        assert_location_access(user, location_id)
        return [location_id]
    if user.can_access_all_locations or user.role == UserRole.OWNER:
        return None
    return user.location_ids


@router.get("/dashboard", response_model=DashboardSummary)
async def get_dashboard(
    location_id: int | None = None,
    expiry_days: int = Query(default=60, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*REPORT_ROLES)),
) -> DashboardSummary:
    allowed_locs = _allowed_location_ids(current_user, location_id)
    today = date.today()
    today_start = datetime.combine(today, time.min, tzinfo=UTC)
    month_start = datetime.combine(today.replace(day=1), time.min, tzinfo=UTC)

    # Sales today
    today_stmt = select(
        func.coalesce(func.sum(Sale.total_amount), 0),
        func.count(Sale.id),
    ).where(Sale.status == SaleStatus.COMPLETED, Sale.created_at >= today_start)
    if allowed_locs is not None:
        today_stmt = today_stmt.where(Sale.location_id.in_(allowed_locs or [-1]))
    sales_today_val, tx_today = (await db.execute(today_stmt)).one()

    # Sales this month
    month_stmt = select(func.coalesce(func.sum(Sale.total_amount), 0)).where(
        Sale.status == SaleStatus.COMPLETED, Sale.created_at >= month_start
    )
    if allowed_locs is not None:
        month_stmt = month_stmt.where(Sale.location_id.in_(allowed_locs or [-1]))
    sales_month_val = (await db.execute(month_stmt)).scalar_one()

    # Estimated gross profit this month (revenue - COGS from sale_items)
    gp_stmt = (
        select(
            func.coalesce(
                func.sum((SaleItem.unit_price - SaleItem.unit_cost) * SaleItem.quantity), 0
            )
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .where(Sale.status == SaleStatus.COMPLETED, Sale.created_at >= month_start)
    )
    if allowed_locs is not None:
        gp_stmt = gp_stmt.where(Sale.location_id.in_(allowed_locs or [-1]))
    gross_profit_est = (await db.execute(gp_stmt)).scalar_one()

    # Inventory batches
    batch_stmt = select(InventoryBatch).where(InventoryBatch.current_quantity > 0)
    if allowed_locs is not None:
        batch_stmt = batch_stmt.where(InventoryBatch.location_id.in_(allowed_locs or [-1]))
    batches = list((await db.execute(batch_stmt)).scalars().all())

    cutoff = today + timedelta(days=expiry_days)
    inventory_value = Decimal("0.00")
    near_expiry = 0
    expired_or_quarantined = 0
    inv_value_by_loc: dict[int, Decimal] = {}
    qty_by_loc_prod: dict[tuple[int, int], int] = {}

    for b in batches:
        if b.status == StockStatus.AVAILABLE and b.expiry_date > today:
            val = b.purchase_cost * Decimal(b.current_quantity)
            inventory_value += val
            inv_value_by_loc[b.location_id] = inv_value_by_loc.get(b.location_id, Decimal("0.00")) + val
            key = (b.location_id, b.product_id)
            qty_by_loc_prod[key] = qty_by_loc_prod.get(key, 0) + b.sellable_quantity
            if b.expiry_date <= cutoff:
                near_expiry += 1
        elif b.status in {StockStatus.EXPIRED, StockStatus.QUARANTINED, StockStatus.DAMAGED} or b.expiry_date <= today:
            expired_or_quarantined += 1

    # Low stock count across active stock-holding locations & active products
    loc_stmt = select(Location).where(Location.is_active.is_(True), Location.holds_stock.is_(True))
    if allowed_locs is not None:
        loc_stmt = loc_stmt.where(Location.id.in_(allowed_locs or [-1]))
    locations = list((await db.execute(loc_stmt)).scalars().all())
    products = list((await db.execute(select(Product).where(Product.is_active.is_(True)))).scalars().all())

    low_stock_count = 0
    for loc in locations:
        for prod in products:
            if prod.min_stock_level > 0:
                avail = qty_by_loc_prod.get((loc.id, prod.id), 0)
                if avail < prod.min_stock_level:
                    low_stock_count += 1

    # Pending POs and Transfers
    po_stmt = select(func.count(PurchaseOrder.id)).where(
        PurchaseOrder.status.in_(
            [
                PurchaseOrderStatus.SUBMITTED,
                PurchaseOrderStatus.APPROVED,
                PurchaseOrderStatus.PARTIALLY_RECEIVED,
            ]
        )
    )
    if allowed_locs is not None:
        po_stmt = po_stmt.where(PurchaseOrder.destination_location_id.in_(allowed_locs or [-1]))
    pending_pos = int((await db.execute(po_stmt)).scalar_one())

    trf_stmt = select(func.count(StockTransfer.id)).where(
        StockTransfer.status.in_(
            [TransferStatus.SUBMITTED, TransferStatus.APPROVED, TransferStatus.DISPATCHED]
        )
    )
    if allowed_locs is not None:
        trf_stmt = trf_stmt.where(
            StockTransfer.to_location_id.in_(allowed_locs or [-1])
            | StockTransfer.from_location_id.in_(allowed_locs or [-1])
        )
    pending_trfs = int((await db.execute(trf_stmt)).scalar_one())

    # Supplier balance (visible to global roles)
    supplier_balance = Decimal("0.00")
    if current_user.can_access_all_locations or current_user.role == UserRole.OWNER:
        supplier_balance = Decimal(
            (await db.execute(select(func.coalesce(func.sum(Supplier.current_balance), 0)))).scalar_one()
        )

    # Branch comparison (this month)
    branch_sales_stmt = (
        select(
            Sale.location_id,
            func.coalesce(func.sum(Sale.total_amount), 0),
            func.count(Sale.id),
        )
        .where(Sale.status == SaleStatus.COMPLETED, Sale.created_at >= month_start)
        .group_by(Sale.location_id)
    )
    if allowed_locs is not None:
        branch_sales_stmt = branch_sales_stmt.where(Sale.location_id.in_(allowed_locs or [-1]))
    branch_sales_map = {
        row[0]: (Decimal(row[1]), int(row[2])) for row in (await db.execute(branch_sales_stmt)).all()
    }

    branch_rows: list[BranchPerformanceRow] = []
    for loc in locations:
        if loc.location_type == LocationType.BRANCH or len(locations) == 1:
            rev, cnt = branch_sales_map.get(loc.id, (Decimal("0.00"), 0))
            branch_rows.append(
                BranchPerformanceRow(
                    location_id=loc.id,
                    location_code=loc.code,
                    location_name=loc.name,
                    sales_revenue=rev,
                    transaction_count=cnt,
                    inventory_value=inv_value_by_loc.get(loc.id, Decimal("0.00")),
                )
            )

    return DashboardSummary(
        sales_today=Decimal(sales_today_val),
        transaction_count_today=int(tx_today),
        sales_this_month=Decimal(sales_month_val),
        estimated_gross_profit_this_month=Decimal(gross_profit_est),
        inventory_value=inventory_value,
        low_stock_alerts=low_stock_count,
        near_expiry_batches=near_expiry,
        expired_or_quarantined_batches=expired_or_quarantined,
        pending_purchase_orders=pending_pos,
        pending_transfers=pending_trfs,
        supplier_outstanding_balance=supplier_balance,
        branch_performance=branch_rows,
    )


@router.get("/low-stock", response_model=list[LowStockItem])
async def get_low_stock_report(
    location_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*REPORT_ROLES)),
) -> list[LowStockItem]:
    allowed_locs = _allowed_location_ids(current_user, location_id)
    loc_stmt = select(Location).where(Location.is_active.is_(True), Location.holds_stock.is_(True))
    if allowed_locs is not None:
        loc_stmt = loc_stmt.where(Location.id.in_(allowed_locs or [-1]))
    locations = list((await db.execute(loc_stmt)).scalars().all())
    products = list((await db.execute(select(Product).where(Product.is_active.is_(True)))).scalars().all())

    today = date.today()
    batch_stmt = select(InventoryBatch).where(
        InventoryBatch.status == StockStatus.AVAILABLE,
        InventoryBatch.expiry_date > today,
        InventoryBatch.current_quantity > 0,
    )
    if allowed_locs is not None:
        batch_stmt = batch_stmt.where(InventoryBatch.location_id.in_(allowed_locs or [-1]))
    batches = list((await db.execute(batch_stmt)).scalars().all())

    qty_map: dict[tuple[int, int], int] = {}
    for b in batches:
        key = (b.location_id, b.product_id)
        qty_map[key] = qty_map.get(key, 0) + b.sellable_quantity

    alerts: list[LowStockItem] = []
    for loc in locations:
        for prod in products:
            avail = qty_map.get((loc.id, prod.id), 0)
            if avail < prod.min_stock_level:
                alerts.append(
                    LowStockItem(
                        location_id=loc.id,
                        location_code=loc.code,
                        location_name=loc.name,
                        product_id=prod.id,
                        sku=prod.sku,
                        product_name=prod.name,
                        available_quantity=avail,
                        min_stock_level=prod.min_stock_level,
                    )
                )
    return alerts


@router.get("/expiry", response_model=list[ExpiryAlertItem])
async def get_expiry_report(
    location_id: int | None = None,
    days: int = Query(default=60, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*REPORT_ROLES)),
) -> list[ExpiryAlertItem]:
    allowed_locs = _allowed_location_ids(current_user, location_id)
    today = date.today()
    cutoff = today + timedelta(days=days)

    stmt = (
        select(InventoryBatch, Location, Product)
        .join(Location, Location.id == InventoryBatch.location_id)
        .join(Product, Product.id == InventoryBatch.product_id)
        .where(
            InventoryBatch.current_quantity > 0,
            InventoryBatch.expiry_date <= cutoff,
        )
        .order_by(InventoryBatch.expiry_date.asc())
    )
    if allowed_locs is not None:
        stmt = stmt.where(InventoryBatch.location_id.in_(allowed_locs or [-1]))

    rows = (await db.execute(stmt)).all()
    return [
        ExpiryAlertItem(
            batch_id=batch.id,
            location_id=loc.id,
            location_code=loc.code,
            product_id=prod.id,
            sku=prod.sku,
            product_name=prod.name,
            batch_number=batch.batch_number,
            expiry_date=batch.expiry_date,
            days_remaining=(batch.expiry_date - today).days,
            current_quantity=batch.current_quantity,
            status=batch.status.value,
        )
        for batch, loc, prod in rows
    ]
