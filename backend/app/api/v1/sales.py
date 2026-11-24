from datetime import UTC, date, datetime, time
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import assert_location_access, get_current_user, require_roles
from app.models.base import utcnow
from app.models.inventory import InventoryBatch, MovementType, StockStatus
from app.models.product import Product
from app.models.sales import (
    DailyClosing,
    PaymentMethod,
    Sale,
    SaleItem,
    SalePayment,
    SaleReturn,
    SaleReturnItem,
    SaleStatus,
)
from app.models.user import User, UserRole
from app.schemas.sales import (
    DailyClosingCreate,
    DailyClosingResponse,
    SaleCreate,
    SaleResponse,
    SaleReturnCreate,
    SaleReturnResponse,
    SaleVoidRequest,
)
from app.services.inventory_service import (
    deduct_fefo_stock,
    receive_into_batch,
    record_stock_movement,
)

router = APIRouter(prefix="/sales", tags=["POS & Sales"])

POS_ROLES = (
    UserRole.OWNER,
    UserRole.HEAD_OFFICE_MANAGER,
    UserRole.BRANCH_MANAGER,
    UserRole.PHARMACIST,
    UserRole.CASHIER,
)


def _gen_code(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10].upper()}"


async def _load_sale(db: AsyncSession, sale_id: int) -> Sale | None:
    res = await db.execute(
        select(Sale)
        .options(selectinload(Sale.items), selectinload(Sale.payments))
        .where(Sale.id == sale_id)
    )
    return res.scalar_one_or_none()


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    payload: SaleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*POS_ROLES)),
) -> Sale:
    assert_location_access(current_user, payload.location_id)

    product_ids = {line.product_id for line in payload.items}
    products_res = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products_by_id = {p.id: p for p in products_res.scalars().all()}
    if len(products_by_id) != len(product_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more products not found")

    sale = Sale(
        invoice_number=_gen_code("INV"),
        location_id=payload.location_id,
        cashier_user_id=current_user.id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        status=SaleStatus.COMPLETED,
        subtotal=Decimal("0.00"),
        discount_amount=payload.discount_amount,
        tax_amount=payload.tax_amount,
        total_amount=Decimal("0.00"),
    )
    db.add(sale)
    await db.flush()

    subtotal = Decimal("0.00")
    for line in payload.items:
        product = products_by_id[line.product_id]
        if not product.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product.name}' is inactive",
            )
        unit_price = line.unit_price if line.unit_price is not None else product.retail_price

        allocations = await deduct_fefo_stock(
            db,
            location_id=payload.location_id,
            product_id=product.id,
            quantity=line.quantity,
            movement_type=MovementType.RETAIL_SALE,
            reference_type="sale",
            reference_id=sale.id,
            reason=f"Retail sale {sale.invoice_number}",
            performed_by_user_id=current_user.id,
        )

        for batch, taken_qty in allocations:
            line_total = unit_price * Decimal(taken_qty)
            subtotal += line_total
            db.add(
                SaleItem(
                    sale_id=sale.id,
                    product_id=product.id,
                    batch_id=batch.id,
                    product_name_snapshot=product.name,
                    batch_number_snapshot=batch.batch_number,
                    quantity=taken_qty,
                    unit_price=unit_price,
                    unit_cost=batch.purchase_cost,
                    line_total=line_total,
                )
            )

    total_amount = subtotal - payload.discount_amount + payload.tax_amount
    if total_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discount cannot exceed sale subtotal",
        )

    payment_total = sum((p.amount for p in payload.payments), Decimal("0.00"))
    if payment_total != total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment total ({payment_total}) must equal sale total ({total_amount})",
        )

    sale.subtotal = subtotal
    sale.total_amount = total_amount

    for pay in payload.payments:
        db.add(
            SalePayment(
                sale_id=sale.id,
                payment_method=pay.payment_method,
                amount=pay.amount,
                reference=pay.reference,
            )
        )

    await db.commit()
    return await _load_sale(db, sale.id)  # type: ignore[return-value]


@router.get("", response_model=list[SaleResponse])
async def list_sales(
    location_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Sale]:
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items), selectinload(Sale.payments))
        .order_by(Sale.created_at.desc())
        .limit(limit)
    )
    if location_id is not None:
        assert_location_access(current_user, location_id)
        stmt = stmt.where(Sale.location_id == location_id)
    elif not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if not current_user.location_ids:
            return []
        stmt = stmt.where(Sale.location_id.in_(current_user.location_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/closings", response_model=list[DailyClosingResponse])
async def list_daily_closings(
    location_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.BRANCH_MANAGER,
            UserRole.ACCOUNTANT,
        )
    ),
) -> list[DailyClosing]:
    stmt = select(DailyClosing).order_by(DailyClosing.closing_date.desc(), DailyClosing.id.desc())
    if location_id is not None:
        assert_location_access(current_user, location_id)
        stmt = stmt.where(DailyClosing.location_id == location_id)
    elif not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if not current_user.location_ids:
            return []
        stmt = stmt.where(DailyClosing.location_id.in_(current_user.location_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/closings", response_model=DailyClosingResponse, status_code=status.HTTP_201_CREATED)
async def create_daily_closing(
    payload: DailyClosingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.BRANCH_MANAGER,
            UserRole.CASHIER,
        )
    ),
) -> DailyClosing:
    assert_location_access(current_user, payload.location_id)
    target_date = payload.closing_date or date.today()

    existing = (
        await db.execute(
            select(DailyClosing).where(
                DailyClosing.location_id == payload.location_id,
                DailyClosing.closing_date == target_date,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Daily closing already submitted for {target_date}",
        )

    day_start = datetime.combine(target_date, time.min, tzinfo=UTC)
    day_end = datetime.combine(target_date, time.max, tzinfo=UTC)

    sales_res = await db.execute(
        select(Sale)
        .options(selectinload(Sale.payments))
        .where(
            Sale.location_id == payload.location_id,
            Sale.status == SaleStatus.COMPLETED,
            Sale.created_at >= day_start,
            Sale.created_at <= day_end,
        )
    )
    sales = list(sales_res.scalars().all())

    expected_by_method = {m: Decimal("0.00") for m in PaymentMethod}
    total_sales = Decimal("0.00")
    for s in sales:
        total_sales += s.total_amount
        for pay in s.payments:
            expected_by_method[pay.payment_method] += pay.amount

    cash_discrepancy = payload.actual_cash - expected_by_method[PaymentMethod.CASH]

    closing = DailyClosing(
        location_id=payload.location_id,
        closing_date=target_date,
        transaction_count=len(sales),
        total_sales_amount=total_sales,
        expected_cash=expected_by_method[PaymentMethod.CASH],
        expected_card=expected_by_method[PaymentMethod.CARD],
        expected_mobile_money=expected_by_method[PaymentMethod.MOBILE_MONEY],
        expected_bank_transfer=expected_by_method[PaymentMethod.BANK_TRANSFER],
        actual_cash=payload.actual_cash,
        actual_non_cash=payload.actual_non_cash,
        cash_discrepancy=cash_discrepancy,
        notes=payload.notes,
        submitted_by_user_id=current_user.id,
    )
    db.add(closing)
    await db.flush()

    await record_audit(
        db,
        action="sales.daily_closing",
        entity_type="daily_closing",
        entity_id=closing.id,
        user_id=current_user.id,
        location_id=payload.location_id,
        new_values={
            "closing_date": str(target_date),
            "total_sales": str(total_sales),
            "cash_discrepancy": str(cash_discrepancy),
        },
        reason=payload.notes,
    )
    await db.commit()
    await db.refresh(closing)
    return closing


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Sale:
    sale = await _load_sale(db, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    assert_location_access(current_user, sale.location_id)
    return sale


@router.post("/{sale_id}/void", response_model=SaleResponse)
async def void_sale(
    sale_id: int,
    payload: SaleVoidRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER, UserRole.BRANCH_MANAGER)
    ),
) -> Sale:
    sale = await _load_sale(db, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    assert_location_access(current_user, sale.location_id)

    if sale.status == SaleStatus.VOIDED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sale is already voided")

    for item in sale.items:
        batch = (
            await db.execute(
                select(InventoryBatch).where(InventoryBatch.id == item.batch_id).with_for_update()
            )
        ).scalar_one()
        batch.current_quantity += item.quantity
        await record_stock_movement(
            db,
            batch=batch,
            movement_type=MovementType.SALE_VOID,
            quantity_change=item.quantity,
            reference_type="sale_void",
            reference_id=sale.id,
            reason=payload.reason,
            performed_by_user_id=current_user.id,
        )

    sale.status = SaleStatus.VOIDED
    sale.void_reason = payload.reason
    sale.voided_by_user_id = current_user.id
    sale.voided_at = utcnow()

    await record_audit(
        db,
        action="sales.void",
        entity_type="sale",
        entity_id=sale.id,
        user_id=current_user.id,
        location_id=sale.location_id,
        new_values={"invoice_number": sale.invoice_number, "total_amount": str(sale.total_amount)},
        reason=payload.reason,
    )
    await db.commit()
    return await _load_sale(db, sale.id)  # type: ignore[return-value]


@router.post(
    "/{sale_id}/returns",
    response_model=SaleReturnResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_sale_return(
    sale_id: int,
    payload: SaleReturnCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*POS_ROLES)),
) -> SaleReturn:
    sale = await _load_sale(db, sale_id)
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    assert_location_access(current_user, sale.location_id)

    if sale.status != SaleStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot return items from a voided sale",
        )

    items_by_id = {item.id: item for item in sale.items}

    # Sum already returned quantities per sale_item_id
    prev_res = await db.execute(
        select(SaleReturnItem.sale_item_id, func.coalesce(func.sum(SaleReturnItem.quantity), 0))
        .where(SaleReturnItem.sale_item_id.in_(list(items_by_id.keys())))
        .group_by(SaleReturnItem.sale_item_id)
    )
    already_returned = {row[0]: int(row[1]) for row in prev_res.all()}

    sale_return = SaleReturn(
        return_number=_gen_code("RET"),
        sale_id=sale.id,
        location_id=sale.location_id,
        reason=payload.reason,
        refund_method=payload.refund_method,
        refund_amount=Decimal("0.00"),
        processed_by_user_id=current_user.id,
    )
    db.add(sale_return)
    await db.flush()

    total_refund = Decimal("0.00")
    for line in payload.items:
        sale_item = items_by_id.get(line.sale_item_id)
        if sale_item is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sale item {line.sale_item_id} does not belong to sale {sale.id}",
            )
        remaining_returnable = sale_item.quantity - already_returned.get(sale_item.id, 0)
        if line.quantity > remaining_returnable:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot return {line.quantity}; only {remaining_returnable} remaining",
            )

        orig_batch = (
            await db.execute(select(InventoryBatch).where(InventoryBatch.id == sale_item.batch_id))
        ).scalar_one()

        # Returned medicine enters QUARANTINED stock, never directly available for resale
        quarantine_batch = await receive_into_batch(
            db,
            location_id=sale.location_id,
            product_id=sale_item.product_id,
            batch_number=orig_batch.batch_number,
            expiry_date=orig_batch.expiry_date,
            quantity=line.quantity,
            purchase_cost=sale_item.unit_cost,
            movement_type=MovementType.SALE_RETURN,
            supplier_id=orig_batch.supplier_id,
            batch_status=StockStatus.QUARANTINED,
            reference_type="sale_return",
            reference_id=sale_return.id,
            reason=f"Customer return {sale_return.return_number}: {payload.reason}",
            performed_by_user_id=current_user.id,
        )

        line_refund = sale_item.unit_price * Decimal(line.quantity)
        total_refund += line_refund
        db.add(
            SaleReturnItem(
                sale_return_id=sale_return.id,
                sale_item_id=sale_item.id,
                product_id=sale_item.product_id,
                quarantine_batch_id=quarantine_batch.id,
                quantity=line.quantity,
                condition=line.condition,
                refund_amount=line_refund,
            )
        )

    sale_return.refund_amount = total_refund

    await record_audit(
        db,
        action="sales.return",
        entity_type="sale_return",
        entity_id=sale_return.id,
        user_id=current_user.id,
        location_id=sale.location_id,
        new_values={
            "return_number": sale_return.return_number,
            "sale_id": sale.id,
            "refund_amount": str(total_refund),
        },
        reason=payload.reason,
    )
    await db.commit()

    res = await db.execute(
        select(SaleReturn)
        .options(selectinload(SaleReturn.items))
        .where(SaleReturn.id == sale_return.id)
    )
    return res.scalar_one()
