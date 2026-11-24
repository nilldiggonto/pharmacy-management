from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import assert_location_access, get_current_user, require_roles
from app.core.events import event_bus
from app.models.base import utcnow
from app.models.inventory import MovementType, StockStatus
from app.models.location import Location
from app.models.product import Product
from app.models.transfer import (
    StockTransfer,
    StockTransferDispatchBatch,
    StockTransferItem,
    TransferStatus,
)
from app.models.user import User, UserRole
from app.schemas.transfer import (
    TransferApproveRequest,
    TransferCreate,
    TransferReceiveRequest,
    TransferResponse,
)
from app.services.inventory_service import deduct_fefo_stock, receive_into_batch

router = APIRouter(prefix="/transfers", tags=["Stock Transfers"])


def _gen_transfer_number() -> str:
    return f"TRF-{uuid4().hex[:10].upper()}"


async def _load_transfer(db: AsyncSession, transfer_id: int) -> StockTransfer | None:
    res = await db.execute(
        select(StockTransfer)
        .options(selectinload(StockTransfer.items).selectinload(StockTransferItem.dispatch_batches))
        .where(StockTransfer.id == transfer_id)
    )
    return res.scalar_one_or_none()


@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer_request(
    payload: TransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.BRANCH_MANAGER,
            UserRole.PHARMACIST,
            UserRole.INVENTORY_OFFICER,
        )
    ),
) -> StockTransfer:
    if payload.from_location_id == payload.to_location_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination locations must be different",
        )

    # Branch-scoped staff can only request stock INTO their own assigned branch
    if not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if payload.to_location_id not in current_user.location_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Branch staff can only request stock for their own assigned branch",
            )

    locs = (
        await db.execute(
            select(Location).where(
                Location.id.in_([payload.from_location_id, payload.to_location_id])
            )
        )
    ).scalars().all()
    if len(locs) != 2 or any(not loc.holds_stock for loc in locs):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both locations must exist and hold stock",
        )

    product_ids = {item.product_id for item in payload.items}
    found = (await db.execute(select(Product.id).where(Product.id.in_(product_ids)))).scalars().all()
    if len(found) != len(product_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more products not found")

    transfer = StockTransfer(
        transfer_number=_gen_transfer_number(),
        from_location_id=payload.from_location_id,
        to_location_id=payload.to_location_id,
        status=TransferStatus.SUBMITTED,
        reason=payload.reason,
        requested_by_user_id=current_user.id,
    )
    db.add(transfer)
    await db.flush()

    for item in payload.items:
        db.add(
            StockTransferItem(
                transfer_id=transfer.id,
                product_id=item.product_id,
                requested_quantity=item.requested_quantity,
            )
        )

    await record_audit(
        db,
        action="transfer.create",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        user_id=current_user.id,
        location_id=transfer.to_location_id,
        new_values={
            "transfer_number": transfer.transfer_number,
            "from_location_id": transfer.from_location_id,
            "to_location_id": transfer.to_location_id,
        },
    )
    await db.commit()
    loaded = await _load_transfer(db, transfer.id)
    loc_by_id = {loc.id: loc.code for loc in locs}
    total_qty = sum(i.requested_quantity for i in payload.items)
    await event_bus.publish(
        "transfer.created",
        kind="transfer",
        title=f"Restock requested ({transfer.transfer_number})",
        detail=f"{loc_by_id.get(transfer.to_location_id, 'BR')} requested {total_qty} units from {loc_by_id.get(transfer.from_location_id, 'WH-01')}",
        actor=current_user.full_name,
        from_code=loc_by_id.get(transfer.from_location_id),
        to_code=loc_by_id.get(transfer.to_location_id),
        quantity=total_qty,
    )
    return loaded  # type: ignore[return-value]


@router.get("", response_model=list[TransferResponse])
async def list_transfers(
    transfer_status: TransferStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[StockTransfer]:
    stmt = select(StockTransfer).order_by(StockTransfer.created_at.desc())
    if transfer_status is not None:
        stmt = stmt.where(StockTransfer.status == transfer_status)
    if not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if not current_user.location_ids:
            return []
        stmt = stmt.where(
            or_(
                StockTransfer.from_location_id.in_(current_user.location_ids),
                StockTransfer.to_location_id.in_(current_user.location_ids),
            )
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/{transfer_id}/approve", response_model=TransferResponse)
async def approve_transfer(
    transfer_id: int,
    payload: TransferApproveRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER)),
) -> StockTransfer:
    transfer = (
        await db.execute(select(StockTransfer).where(StockTransfer.id == transfer_id))
    ).scalar_one_or_none()
    if transfer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    if transfer.status != TransferStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve transfer in status '{transfer.status.value}'",
        )

    approved_map = (
        {i.transfer_item_id: i.approved_quantity for i in payload.items}
        if payload and payload.items
        else {}
    )
    for item in transfer.items:
        qty = approved_map.get(item.id, item.requested_quantity)
        if qty > item.requested_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Approved quantity cannot exceed requested quantity",
            )
        item.approved_quantity = qty

    transfer.status = TransferStatus.APPROVED
    transfer.approved_by_user_id = current_user.id

    await record_audit(
        db,
        action="transfer.approve",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        user_id=current_user.id,
        location_id=transfer.from_location_id,
    )
    await db.commit()
    loaded = await _load_transfer(db, transfer.id)
    loc_rows = (
        await db.execute(
            select(Location).where(Location.id.in_([transfer.from_location_id, transfer.to_location_id]))
        )
    ).scalars().all()
    loc_by_id = {loc.id: loc.code for loc in loc_rows}
    total_qty = sum(i.approved_quantity for i in transfer.items)
    await event_bus.publish(
        "transfer.approved",
        kind="transfer",
        title=f"Transfer approved ({transfer.transfer_number})",
        detail=f"Approved {total_qty} units from {loc_by_id.get(transfer.from_location_id, 'WH-01')} to {loc_by_id.get(transfer.to_location_id, 'BR')}",
        actor=current_user.full_name,
        from_code=loc_by_id.get(transfer.from_location_id),
        to_code=loc_by_id.get(transfer.to_location_id),
        quantity=total_qty,
    )
    return loaded  # type: ignore[return-value]


@router.post("/{transfer_id}/dispatch", response_model=TransferResponse)
async def dispatch_transfer(
    transfer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.INVENTORY_OFFICER,
            UserRole.BRANCH_MANAGER,
        )
    ),
) -> StockTransfer:
    transfer = (
        await db.execute(select(StockTransfer).where(StockTransfer.id == transfer_id))
    ).scalar_one_or_none()
    if transfer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")

    assert_location_access(current_user, transfer.from_location_id)
    if transfer.status != TransferStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer must be approved before dispatch",
        )

    for item in transfer.items:
        if item.approved_quantity <= 0:
            continue
        allocations = await deduct_fefo_stock(
            db,
            location_id=transfer.from_location_id,
            product_id=item.product_id,
            quantity=item.approved_quantity,
            movement_type=MovementType.TRANSFER_DISPATCH,
            reference_type="stock_transfer",
            reference_id=transfer.id,
            reason=f"Dispatched transfer {transfer.transfer_number}",
            performed_by_user_id=current_user.id,
        )
        item.dispatched_quantity = sum(qty for _, qty in allocations)
        for batch, qty in allocations:
            db.add(
                StockTransferDispatchBatch(
                    transfer_item_id=item.id,
                    source_batch_id=batch.id,
                    batch_number=batch.batch_number,
                    expiry_date=batch.expiry_date,
                    unit_cost=batch.purchase_cost,
                    dispatched_quantity=qty,
                )
            )

    transfer.status = TransferStatus.DISPATCHED
    transfer.dispatched_by_user_id = current_user.id
    transfer.dispatched_at = utcnow()

    await record_audit(
        db,
        action="transfer.dispatch",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        user_id=current_user.id,
        location_id=transfer.from_location_id,
        new_values={"status": transfer.status.value},
    )
    await db.commit()
    loaded = await _load_transfer(db, transfer.id)
    loc_rows = (
        await db.execute(
            select(Location).where(Location.id.in_([transfer.from_location_id, transfer.to_location_id]))
        )
    ).scalars().all()
    loc_by_id = {loc.id: loc.code for loc in loc_rows}
    total_qty = sum(i.dispatched_quantity for i in transfer.items)
    await event_bus.publish(
        "transfer.dispatched",
        kind="transfer",
        title=f"Stock dispatched ({transfer.transfer_number})",
        detail=f"{loc_by_id.get(transfer.from_location_id, 'WH-01')} sent {total_qty} units to {loc_by_id.get(transfer.to_location_id, 'BR')}",
        actor=current_user.full_name,
        from_code=loc_by_id.get(transfer.from_location_id),
        to_code=loc_by_id.get(transfer.to_location_id),
        quantity=total_qty,
    )
    return loaded  # type: ignore[return-value]


@router.post("/{transfer_id}/receive", response_model=TransferResponse)
async def receive_transfer(
    transfer_id: int,
    payload: TransferReceiveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.BRANCH_MANAGER,
            UserRole.PHARMACIST,
            UserRole.INVENTORY_OFFICER,
        )
    ),
) -> StockTransfer:
    transfer = (
        await db.execute(select(StockTransfer).where(StockTransfer.id == transfer_id))
    ).scalar_one_or_none()
    if transfer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")

    assert_location_access(current_user, transfer.to_location_id)
    if transfer.status != TransferStatus.DISPATCHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer must be dispatched before confirming receipt",
        )

    items_by_id = {item.id: item for item in transfer.items}
    has_shortage = False

    for line in payload.items:
        item = items_by_id.get(line.transfer_item_id)
        if item is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Transfer item {line.transfer_item_id} not found on transfer {transfer.id}",
            )
        if line.received_quantity > item.dispatched_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Received quantity cannot exceed dispatched quantity",
            )

        remaining_to_receive = line.received_quantity
        for dbatch in item.dispatch_batches:
            if remaining_to_receive <= 0:
                break
            take = min(dbatch.dispatched_quantity, remaining_to_receive)
            if take > 0:
                await receive_into_batch(
                    db,
                    location_id=transfer.to_location_id,
                    product_id=item.product_id,
                    batch_number=dbatch.batch_number,
                    expiry_date=dbatch.expiry_date,
                    quantity=take,
                    purchase_cost=dbatch.unit_cost,
                    movement_type=MovementType.TRANSFER_RECEIPT,
                    batch_status=StockStatus.AVAILABLE,
                    reference_type="stock_transfer",
                    reference_id=transfer.id,
                    reason=f"Received transfer {transfer.transfer_number}",
                    performed_by_user_id=current_user.id,
                )
                dbatch.received_quantity = take
                remaining_to_receive -= take

        item.received_quantity = line.received_quantity
        item.shortage_quantity = item.dispatched_quantity - line.received_quantity
        if item.shortage_quantity > 0:
            has_shortage = True

    transfer.received_by_user_id = current_user.id
    transfer.received_at = utcnow()
    transfer.discrepancy_notes = payload.discrepancy_notes
    transfer.status = (
        TransferStatus.UNDER_INVESTIGATION if has_shortage else TransferStatus.RECEIVED
    )

    await record_audit(
        db,
        action="transfer.receive",
        entity_type="stock_transfer",
        entity_id=transfer.id,
        user_id=current_user.id,
        location_id=transfer.to_location_id,
        new_values={
            "status": transfer.status.value,
            "has_shortage": has_shortage,
        },
        reason=payload.discrepancy_notes,
    )
    await db.commit()
    loaded = await _load_transfer(db, transfer.id)
    loc_rows = (
        await db.execute(
            select(Location).where(Location.id.in_([transfer.from_location_id, transfer.to_location_id]))
        )
    ).scalars().all()
    loc_by_id = {loc.id: loc.code for loc in loc_rows}
    total_rec = sum(i.received_quantity for i in transfer.items)
    await event_bus.publish(
        "transfer.received",
        kind="receipt",
        title=f"Transfer received ({transfer.transfer_number})",
        detail=f"{loc_by_id.get(transfer.to_location_id, 'BR')} confirmed {total_rec} units ({transfer.status.value})",
        actor=current_user.full_name,
        from_code=loc_by_id.get(transfer.from_location_id),
        to_code=loc_by_id.get(transfer.to_location_id),
        quantity=total_rec,
    )
    return loaded  # type: ignore[return-value]
