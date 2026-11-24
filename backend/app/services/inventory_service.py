from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import InventoryBatch, MovementType, StockMovement, StockStatus


async def record_stock_movement(
    db: AsyncSession,
    *,
    batch: InventoryBatch,
    movement_type: MovementType,
    quantity_change: int,
    reference_type: str | None = None,
    reference_id: str | int | None = None,
    reason: str | None = None,
    performed_by_user_id: int | None = None,
) -> StockMovement:
    movement = StockMovement(
        location_id=batch.location_id,
        product_id=batch.product_id,
        batch_id=batch.id,
        movement_type=movement_type,
        quantity_change=quantity_change,
        balance_after=batch.current_quantity,
        reference_type=reference_type,
        reference_id=str(reference_id) if reference_id is not None else None,
        reason=reason,
        performed_by_user_id=performed_by_user_id,
    )
    db.add(movement)
    return movement


async def receive_into_batch(
    db: AsyncSession,
    *,
    location_id: int,
    product_id: int,
    batch_number: str,
    expiry_date: date,
    quantity: int,
    purchase_cost: Decimal,
    movement_type: MovementType,
    supplier_id: int | None = None,
    received_date: date | None = None,
    batch_status: StockStatus = StockStatus.AVAILABLE,
    reference_type: str | None = None,
    reference_id: str | int | None = None,
    reason: str | None = None,
    performed_by_user_id: int | None = None,
    notes: str | None = None,
) -> InventoryBatch:
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Received quantity must be positive",
        )

    existing_res = await db.execute(
        select(InventoryBatch)
        .where(
            InventoryBatch.location_id == location_id,
            InventoryBatch.product_id == product_id,
            InventoryBatch.batch_number == batch_number,
            InventoryBatch.expiry_date == expiry_date,
            InventoryBatch.status == batch_status,
        )
        .with_for_update()
    )
    batch = existing_res.scalar_one_or_none()

    if batch is None:
        batch = InventoryBatch(
            location_id=location_id,
            product_id=product_id,
            supplier_id=supplier_id,
            batch_number=batch_number,
            expiry_date=expiry_date,
            received_date=received_date or date.today(),
            purchase_cost=purchase_cost,
            initial_quantity=quantity,
            current_quantity=quantity,
            reserved_quantity=0,
            status=batch_status,
            notes=notes,
        )
        db.add(batch)
        await db.flush()
    else:
        batch.current_quantity += quantity
        batch.initial_quantity += quantity

    await record_stock_movement(
        db,
        batch=batch,
        movement_type=movement_type,
        quantity_change=quantity,
        reference_type=reference_type,
        reference_id=reference_id,
        reason=reason,
        performed_by_user_id=performed_by_user_id,
    )
    return batch


async def deduct_fefo_stock(
    db: AsyncSession,
    *,
    location_id: int,
    product_id: int,
    quantity: int,
    movement_type: MovementType,
    reference_type: str | None = None,
    reference_id: str | int | None = None,
    reason: str | None = None,
    performed_by_user_id: int | None = None,
    specific_batch_id: int | None = None,
) -> list[tuple[InventoryBatch, int]]:
    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be positive",
        )

    today = date.today()
    stmt = (
        select(InventoryBatch)
        .where(
            InventoryBatch.location_id == location_id,
            InventoryBatch.product_id == product_id,
            InventoryBatch.status == StockStatus.AVAILABLE,
            InventoryBatch.expiry_date > today,
            InventoryBatch.current_quantity > InventoryBatch.reserved_quantity,
        )
        .order_by(InventoryBatch.expiry_date.asc(), InventoryBatch.id.asc())
        .with_for_update()
    )
    if specific_batch_id is not None:
        stmt = stmt.where(InventoryBatch.id == specific_batch_id)

    result = await db.execute(stmt)
    batches = list(result.scalars().all())

    total_available = sum(b.current_quantity - b.reserved_quantity for b in batches)
    if total_available < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient eligible non-expired stock for product {product_id} "
                f"at location {location_id} (available: {total_available}, requested: {quantity})"
            ),
        )

    allocations: list[tuple[InventoryBatch, int]] = []
    remaining = quantity
    for batch in batches:
        if remaining <= 0:
            break
        available = batch.current_quantity - batch.reserved_quantity
        take = min(available, remaining)
        if take <= 0:
            continue
        batch.current_quantity -= take
        remaining -= take
        allocations.append((batch, take))
        await record_stock_movement(
            db,
            batch=batch,
            movement_type=movement_type,
            quantity_change=-take,
            reference_type=reference_type,
            reference_id=reference_id,
            reason=reason,
            performed_by_user_id=performed_by_user_id,
        )

    return allocations
