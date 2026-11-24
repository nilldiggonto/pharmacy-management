from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import assert_location_access, require_roles
from app.core.events import event_bus
from app.models.base import utcnow
from app.models.inventory import MovementType, StockStatus
from app.models.location import Location
from app.models.product import Product
from app.models.purchasing import (
    GoodsReceipt,
    GoodsReceiptItem,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
)
from app.models.supplier import Supplier
from app.models.user import User, UserRole
from app.schemas.purchasing import (
    GoodsReceiptCreate,
    GoodsReceiptResponse,
    PurchaseOrderCreate,
    PurchaseOrderResponse,
)
from app.services.inventory_service import receive_into_batch

router = APIRouter(prefix="/purchasing", tags=["Purchasing"])

PO_READ_ROLES = (
    UserRole.OWNER,
    UserRole.HEAD_OFFICE_MANAGER,
    UserRole.PROCUREMENT_OFFICER,
    UserRole.INVENTORY_OFFICER,
    UserRole.STOCK_ENTRY_OPERATOR,
    UserRole.ACCOUNTANT,
    UserRole.BRANCH_MANAGER,
)


def _gen_number(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10].upper()}"


@router.post("/orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.PROCUREMENT_OFFICER,
        )
    ),
) -> PurchaseOrder:
    supplier = (
        await db.execute(select(Supplier).where(Supplier.id == payload.supplier_id))
    ).scalar_one_or_none()
    if supplier is None or not supplier.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active supplier not found")

    location = (
        await db.execute(select(Location).where(Location.id == payload.destination_location_id))
    ).scalar_one_or_none()
    if location is None or not location.holds_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination location not found or does not hold stock",
        )

    product_ids = {item.product_id for item in payload.items}
    products = (
        await db.execute(select(Product.id).where(Product.id.in_(product_ids)))
    ).scalars().all()
    if len(products) != len(product_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more products not found")

    total_amount = sum(
        (item.unit_cost * Decimal(item.quantity_ordered) for item in payload.items),
        Decimal("0.00"),
    )

    po = PurchaseOrder(
        po_number=_gen_number("PO"),
        supplier_id=payload.supplier_id,
        destination_location_id=payload.destination_location_id,
        status=PurchaseOrderStatus.SUBMITTED,
        expected_date=payload.expected_date,
        total_amount=total_amount,
        notes=payload.notes,
        created_by_user_id=current_user.id,
    )
    db.add(po)
    await db.flush()

    for item in payload.items:
        db.add(
            PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=item.product_id,
                quantity_ordered=item.quantity_ordered,
                unit_cost=item.unit_cost,
            )
        )

    await record_audit(
        db,
        action="purchasing.po_create",
        entity_type="purchase_order",
        entity_id=po.id,
        user_id=current_user.id,
        location_id=po.destination_location_id,
        new_values={"po_number": po.po_number, "total_amount": str(total_amount)},
    )
    await db.commit()
    await db.refresh(po)
    return po


@router.get("/orders", response_model=list[PurchaseOrderResponse])
async def list_purchase_orders(
    po_status: PurchaseOrderStatus | None = None,
    supplier_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*PO_READ_ROLES)),
) -> list[PurchaseOrder]:
    stmt = select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc())
    if po_status is not None:
        stmt = stmt.where(PurchaseOrder.status == po_status)
    if supplier_id is not None:
        stmt = stmt.where(PurchaseOrder.supplier_id == supplier_id)
    if not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if not current_user.location_ids:
            return []
        stmt = stmt.where(PurchaseOrder.destination_location_id.in_(current_user.location_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/orders/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*PO_READ_ROLES)),
) -> PurchaseOrder:
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if po is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    assert_location_access(current_user, po.destination_location_id)
    return po


@router.post("/orders/{po_id}/approve", response_model=PurchaseOrderResponse)
async def approve_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER)),
) -> PurchaseOrder:
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if po is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    if po.status not in {PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SUBMITTED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve PO in status '{po.status.value}'",
        )

    po.status = PurchaseOrderStatus.APPROVED
    po.approved_by_user_id = current_user.id
    po.approved_at = utcnow()

    await record_audit(
        db,
        action="purchasing.po_approve",
        entity_type="purchase_order",
        entity_id=po.id,
        user_id=current_user.id,
        location_id=po.destination_location_id,
    )
    await db.commit()
    await db.refresh(po)
    return po


@router.post("/orders/{po_id}/cancel", response_model=PurchaseOrderResponse)
async def cancel_purchase_order(
    po_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER, UserRole.PROCUREMENT_OFFICER)
    ),
) -> PurchaseOrder:
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if po is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    if po.status in {
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
        PurchaseOrderStatus.RECEIVED,
        PurchaseOrderStatus.CANCELLED,
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel PO in status '{po.status.value}'",
        )

    po.status = PurchaseOrderStatus.CANCELLED
    await record_audit(
        db,
        action="purchasing.po_cancel",
        entity_type="purchase_order",
        entity_id=po.id,
        user_id=current_user.id,
        location_id=po.destination_location_id,
    )
    await db.commit()
    await db.refresh(po)
    return po


@router.post(
    "/orders/{po_id}/receive",
    response_model=GoodsReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def receive_goods(
    po_id: int,
    payload: GoodsReceiptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.INVENTORY_OFFICER,
            UserRole.STOCK_ENTRY_OPERATOR,
            UserRole.BRANCH_MANAGER,
        )
    ),
) -> GoodsReceipt:
    po = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == po_id))).scalar_one_or_none()
    if po is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
    assert_location_access(current_user, po.destination_location_id)

    if po.status not in {PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.PARTIALLY_RECEIVED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase order must be approved before receiving goods",
        )

    po_items_by_id = {item.id: item for item in po.items}
    receipt = GoodsReceipt(
        receipt_number=_gen_number("GRN"),
        purchase_order_id=po.id,
        location_id=po.destination_location_id,
        supplier_id=po.supplier_id,
        supplier_invoice_number=payload.supplier_invoice_number,
        received_by_user_id=current_user.id,
        notes=payload.notes,
    )
    db.add(receipt)
    await db.flush()

    received_value = Decimal("0.00")
    for line in payload.items:
        po_item = po_items_by_id.get(line.po_item_id)
        if po_item is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"PO item {line.po_item_id} does not belong to PO {po.id}",
            )
        remaining = po_item.quantity_ordered - po_item.quantity_received
        if line.quantity_received > remaining:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot receive {line.quantity_received} for PO item {po_item.id}; "
                    f"remaining ordered quantity is {remaining}"
                ),
            )

        cost = line.unit_cost if line.unit_cost is not None else po_item.unit_cost
        good_qty = line.quantity_received - line.damaged_quantity
        if good_qty < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="damaged_quantity cannot exceed quantity_received",
            )

        primary_batch = None
        if good_qty > 0:
            primary_batch = await receive_into_batch(
                db,
                location_id=po.destination_location_id,
                product_id=po_item.product_id,
                batch_number=line.batch_number,
                expiry_date=line.expiry_date,
                quantity=good_qty,
                purchase_cost=cost,
                movement_type=MovementType.PURCHASE_RECEIPT,
                supplier_id=po.supplier_id,
                batch_status=StockStatus.AVAILABLE,
                reference_type="goods_receipt",
                reference_id=receipt.id,
                reason=f"Goods receipt {receipt.receipt_number} for {po.po_number}",
                performed_by_user_id=current_user.id,
            )

        if line.damaged_quantity > 0:
            damaged_batch = await receive_into_batch(
                db,
                location_id=po.destination_location_id,
                product_id=po_item.product_id,
                batch_number=line.batch_number,
                expiry_date=line.expiry_date,
                quantity=line.damaged_quantity,
                purchase_cost=cost,
                movement_type=MovementType.PURCHASE_RECEIPT,
                supplier_id=po.supplier_id,
                batch_status=StockStatus.DAMAGED,
                reference_type="goods_receipt",
                reference_id=receipt.id,
                reason=f"Damaged on receipt {receipt.receipt_number}",
                performed_by_user_id=current_user.id,
            )
            if primary_batch is None:
                primary_batch = damaged_batch

        po_item.quantity_received += line.quantity_received
        received_value += cost * Decimal(good_qty)

        db.add(
            GoodsReceiptItem(
                goods_receipt_id=receipt.id,
                po_item_id=po_item.id,
                product_id=po_item.product_id,
                batch_id=primary_batch.id,
                batch_number=line.batch_number,
                expiry_date=line.expiry_date,
                quantity_received=line.quantity_received,
                damaged_quantity=line.damaged_quantity,
                unit_cost=cost,
            )
        )

    supplier = (await db.execute(select(Supplier).where(Supplier.id == po.supplier_id))).scalar_one()
    supplier.current_balance += received_value

    all_received = all(item.quantity_received >= item.quantity_ordered for item in po.items)
    po.status = (
        PurchaseOrderStatus.RECEIVED if all_received else PurchaseOrderStatus.PARTIALLY_RECEIVED
    )

    await record_audit(
        db,
        action="purchasing.goods_receipt",
        entity_type="goods_receipt",
        entity_id=receipt.id,
        user_id=current_user.id,
        location_id=po.destination_location_id,
        new_values={
            "receipt_number": receipt.receipt_number,
            "po_id": po.id,
            "po_status": po.status.value,
            "received_value": str(received_value),
        },
    )
    await db.commit()
    await db.refresh(receipt)
    dest_loc = (
        await db.execute(select(Location).where(Location.id == po.destination_location_id))
    ).scalar_one_or_none()
    total_rec = sum(line.quantity_received for line in payload.items)
    await event_bus.publish(
        "purchasing.goods_received",
        kind="receipt",
        title=f"Goods received ({receipt.receipt_number})",
        detail=f"{dest_loc.name if dest_loc else 'Uttara Hub'} received {total_rec} units on {po.po_number}",
        actor=current_user.full_name,
        from_code="SUPPLIER",
        to_code=dest_loc.code if dest_loc else "WH-01",
        quantity=total_rec,
    )
    return receipt

