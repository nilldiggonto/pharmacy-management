from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import assert_location_access, get_current_user, require_roles
from app.core.events import event_bus
from app.models.base import utcnow
from app.models.inventory import (
    AdjustmentStatus,
    InventoryBatch,
    MovementType,
    StockAdjustment,
    StockMovement,
    StockStatus,
)
from app.models.location import Location
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.inventory import (
    BatchResponse,
    BatchStatusUpdate,
    StockAdjustmentCreate,
    StockAdjustmentDecision,
    StockAdjustmentResponse,
    StockMovementResponse,
)
from app.services.inventory_service import record_stock_movement

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/availability")
async def network_stock_availability(
    q: str | None = None,
    product_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[dict]:
    """Network-wide stock availability lookup across Uttara Main Hub and all branches."""
    prod_stmt = select(Product).where(Product.is_active.is_(True)).order_by(Product.name.asc())
    if product_id is not None:
        prod_stmt = prod_stmt.where(Product.id == product_id)
    if q and q.strip():
        pattern = f"%{q.strip().lower()}%"
        prod_stmt = prod_stmt.where(
            Product.name.ilike(pattern)
            | Product.sku.ilike(pattern)
            | Product.generic_name.ilike(pattern)
            | Product.brand_name.ilike(pattern)
            | Product.category.ilike(pattern)
        )
    products = list((await db.execute(prod_stmt)).scalars().all())
    if not products:
        return []

    locs = list(
        (
            await db.execute(
                select(Location)
                .where(Location.holds_stock.is_(True), Location.is_active.is_(True))
                .order_by(Location.id.asc())
            )
        )
        .scalars()
        .all()
    )

    today = date.today()
    p_ids = [p.id for p in products]
    batches = list(
        (
            await db.execute(
                select(InventoryBatch).where(
                    InventoryBatch.product_id.in_(p_ids),
                    InventoryBatch.status == StockStatus.AVAILABLE,
                    InventoryBatch.expiry_date > today,
                    InventoryBatch.current_quantity > InventoryBatch.reserved_quantity,
                )
            )
        )
        .scalars()
        .all()
    )

    by_prod_loc: dict[tuple[int, int], list[InventoryBatch]] = {}
    for b in batches:
        by_prod_loc.setdefault((b.product_id, b.location_id), []).append(b)

    response: list[dict] = []
    for p in products:
        loc_rows: list[dict] = []
        total_available = 0
        for loc in locs:
            loc_batches = by_prod_loc.get((p.id, loc.id), [])
            avail = sum(max(0, b.current_quantity - b.reserved_quantity) for b in loc_batches)
            total_available += avail
            nearest_exp = min((b.expiry_date for b in loc_batches), default=None)
            loc_rows.append(
                {
                    "location_id": loc.id,
                    "location_code": loc.code,
                    "location_name": loc.name,
                    "location_type": loc.location_type.value,
                    "available_quantity": avail,
                    "batch_count": len(loc_batches),
                    "nearest_expiry": nearest_exp.isoformat() if nearest_exp else None,
                }
            )
        response.append(
            {
                "product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "generic_name": p.generic_name,
                "category": p.category,
                "requires_prescription": p.requires_prescription,
                "retail_price": float(p.retail_price),
                "wholesale_price": float(p.wholesale_price) if p.wholesale_price is not None else float(p.retail_price),
                "min_stock_level": p.min_stock_level,
                "total_available": total_available,
                "locations": loc_rows,
            }
        )
    return response


@router.get("/batches", response_model=list[BatchResponse])
async def list_batches(
    location_id: int | None = None,
    product_id: int | None = None,
    batch_status: StockStatus | None = None,
    expiring_within_days: int | None = Query(default=None, ge=1, le=365),
    include_empty: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InventoryBatch]:
    stmt = select(InventoryBatch).order_by(InventoryBatch.expiry_date.asc(), InventoryBatch.id.asc())
    if location_id is not None:
        assert_location_access(current_user, location_id)
        stmt = stmt.where(InventoryBatch.location_id == location_id)
    elif not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if not current_user.location_ids:
            return []
        stmt = stmt.where(InventoryBatch.location_id.in_(current_user.location_ids))

    if product_id is not None:
        stmt = stmt.where(InventoryBatch.product_id == product_id)
    if batch_status is not None:
        stmt = stmt.where(InventoryBatch.status == batch_status)
    if not include_empty:
        stmt = stmt.where(InventoryBatch.current_quantity > 0)
    if expiring_within_days is not None:
        cutoff = date.today() + timedelta(days=expiring_within_days)
        stmt = stmt.where(InventoryBatch.expiry_date <= cutoff)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/movements", response_model=list[StockMovementResponse])
async def list_movements(
    location_id: int | None = None,
    product_id: int | None = None,
    batch_id: int | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StockMovement]:
    stmt = (
        select(StockMovement)
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
        .limit(limit)
    )
    if location_id is not None:
        assert_location_access(current_user, location_id)
        stmt = stmt.where(StockMovement.location_id == location_id)
    elif not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if not current_user.location_ids:
            return []
        stmt = stmt.where(StockMovement.location_id.in_(current_user.location_ids))

    if product_id is not None:
        stmt = stmt.where(StockMovement.product_id == product_id)
    if batch_id is not None:
        stmt = stmt.where(StockMovement.batch_id == batch_id)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.patch("/batches/{batch_id}/status", response_model=BatchResponse)
async def update_batch_status(
    batch_id: int,
    payload: BatchStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.BRANCH_MANAGER,
            UserRole.INVENTORY_OFFICER,
        )
    ),
) -> InventoryBatch:
    result = await db.execute(select(InventoryBatch).where(InventoryBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    assert_location_access(current_user, batch.location_id)
    if payload.status == StockStatus.AVAILABLE and batch.expiry_date <= date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expired batch cannot be marked available",
        )

    previous_status = batch.status.value
    batch.status = payload.status
    if payload.status in {StockStatus.DISPOSED, StockStatus.EXPIRED, StockStatus.DAMAGED}:
        movement_type = (
            MovementType.EXPIRY_WRITE_OFF
            if payload.status == StockStatus.EXPIRED
            else MovementType.DAMAGE_LOSS
        )
        await record_stock_movement(
            db,
            batch=batch,
            movement_type=movement_type,
            quantity_change=0,
            reference_type="batch_status_change",
            reference_id=batch.id,
            reason=payload.reason,
            performed_by_user_id=current_user.id,
        )

    await record_audit(
        db,
        action="inventory.batch_status_change",
        entity_type="inventory_batch",
        entity_id=batch.id,
        user_id=current_user.id,
        location_id=batch.location_id,
        previous_values={"status": previous_status},
        new_values={"status": batch.status.value},
        reason=payload.reason,
    )
    await db.commit()
    await db.refresh(batch)
    await event_bus.publish(
        "inventory.batch_status",
        kind="system",
        title=f"Batch {batch.batch_number} marked {batch.status.value}",
        detail=payload.reason,
        actor=current_user.full_name,
    )
    return batch


@router.post("/adjustments", response_model=StockAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def request_stock_adjustment(
    payload: StockAdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.BRANCH_MANAGER,
            UserRole.INVENTORY_OFFICER,
        )
    ),
) -> StockAdjustment:
    result = await db.execute(select(InventoryBatch).where(InventoryBatch.id == payload.batch_id))
    batch = result.scalar_one_or_none()
    if batch is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    assert_location_access(current_user, batch.location_id)
    if batch.current_quantity + payload.quantity_change < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment would result in negative stock quantity",
        )

    adjustment = StockAdjustment(
        location_id=batch.location_id,
        product_id=batch.product_id,
        batch_id=batch.id,
        quantity_change=payload.quantity_change,
        reason=payload.reason,
        status=AdjustmentStatus.PENDING,
        requested_by_user_id=current_user.id,
        notes=payload.notes,
    )
    db.add(adjustment)
    await db.flush()

    await record_audit(
        db,
        action="inventory.adjustment_request",
        entity_type="stock_adjustment",
        entity_id=adjustment.id,
        user_id=current_user.id,
        location_id=batch.location_id,
        new_values={"batch_id": batch.id, "quantity_change": payload.quantity_change},
        reason=payload.reason,
    )
    await db.commit()
    await db.refresh(adjustment)
    return adjustment


@router.get("/adjustments", response_model=list[StockAdjustmentResponse])
async def list_adjustments(
    location_id: int | None = None,
    adj_status: AdjustmentStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StockAdjustment]:
    stmt = select(StockAdjustment).order_by(StockAdjustment.created_at.desc())
    if location_id is not None:
        assert_location_access(current_user, location_id)
        stmt = stmt.where(StockAdjustment.location_id == location_id)
    elif not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if not current_user.location_ids:
            return []
        stmt = stmt.where(StockAdjustment.location_id.in_(current_user.location_ids))
    if adj_status is not None:
        stmt = stmt.where(StockAdjustment.status == adj_status)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/adjustments/{adjustment_id}/approve", response_model=StockAdjustmentResponse)
async def approve_stock_adjustment(
    adjustment_id: int,
    payload: StockAdjustmentDecision | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER, UserRole.BRANCH_MANAGER)
    ),
) -> StockAdjustment:
    result = await db.execute(select(StockAdjustment).where(StockAdjustment.id == adjustment_id))
    adjustment = result.scalar_one_or_none()
    if adjustment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjustment not found")

    assert_location_access(current_user, adjustment.location_id)
    if adjustment.status != AdjustmentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment is already {adjustment.status.value}",
        )
    if adjustment.requested_by_user_id == current_user.id and current_user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Users cannot approve their own stock adjustments",
        )

    batch_res = await db.execute(
        select(InventoryBatch).where(InventoryBatch.id == adjustment.batch_id).with_for_update()
    )
    batch = batch_res.scalar_one()
    if batch.current_quantity + adjustment.quantity_change < batch.reserved_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment would reduce stock below reserved quantity",
        )

    batch.current_quantity += adjustment.quantity_change
    adjustment.status = AdjustmentStatus.APPROVED
    adjustment.approved_by_user_id = current_user.id
    adjustment.approved_at = utcnow()
    if payload and payload.notes:
        adjustment.notes = payload.notes

    movement_type = (
        MovementType.ADJUSTMENT_IN if adjustment.quantity_change > 0 else MovementType.ADJUSTMENT_OUT
    )
    await record_stock_movement(
        db,
        batch=batch,
        movement_type=movement_type,
        quantity_change=adjustment.quantity_change,
        reference_type="stock_adjustment",
        reference_id=adjustment.id,
        reason=adjustment.reason,
        performed_by_user_id=current_user.id,
    )
    await record_audit(
        db,
        action="inventory.adjustment_approve",
        entity_type="stock_adjustment",
        entity_id=adjustment.id,
        user_id=current_user.id,
        location_id=adjustment.location_id,
        new_values={"quantity_change": adjustment.quantity_change, "balance_after": batch.current_quantity},
        reason=adjustment.reason,
    )
    await db.commit()
    await db.refresh(adjustment)
    return adjustment


@router.post("/adjustments/{adjustment_id}/reject", response_model=StockAdjustmentResponse)
async def reject_stock_adjustment(
    adjustment_id: int,
    payload: StockAdjustmentDecision | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER, UserRole.BRANCH_MANAGER)
    ),
) -> StockAdjustment:
    result = await db.execute(select(StockAdjustment).where(StockAdjustment.id == adjustment_id))
    adjustment = result.scalar_one_or_none()
    if adjustment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjustment not found")

    assert_location_access(current_user, adjustment.location_id)
    if adjustment.status != AdjustmentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment is already {adjustment.status.value}",
        )

    adjustment.status = AdjustmentStatus.REJECTED
    adjustment.approved_by_user_id = current_user.id
    adjustment.approved_at = utcnow()
    if payload and payload.notes:
        adjustment.notes = payload.notes

    await record_audit(
        db,
        action="inventory.adjustment_reject",
        entity_type="stock_adjustment",
        entity_id=adjustment.id,
        user_id=current_user.id,
        location_id=adjustment.location_id,
        reason=payload.notes if payload else None,
    )
    await db.commit()
    await db.refresh(adjustment)
    return adjustment

