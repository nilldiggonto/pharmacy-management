from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import assert_location_access, get_current_user, require_roles
from app.models.location import Location
from app.models.user import User, UserRole
from app.schemas.location import LocationCreate, LocationResponse, LocationUpdate

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    payload: LocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER)),
) -> Location:
    existing = await db.execute(select(Location).where(Location.code == payload.code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Location code '{payload.code}' already exists",
        )

    location = Location(
        name=payload.name,
        code=payload.code.upper(),
        location_type=payload.location_type,
        address=payload.address,
        phone=payload.phone,
        email=payload.email,
        holds_stock=payload.holds_stock,
        manager_user_id=payload.manager_user_id,
    )
    db.add(location)
    await db.flush()

    await record_audit(
        db,
        action="location.create",
        entity_type="location",
        entity_id=location.id,
        user_id=current_user.id,
        location_id=location.id,
        new_values={"name": location.name, "code": location.code, "type": location.location_type.value},
    )
    await db.commit()
    await db.refresh(location)
    return location


@router.get("", response_model=list[LocationResponse])
async def list_locations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Location]:
    stmt = select(Location).order_by(Location.id)
    if not current_user.can_access_all_locations and current_user.role != UserRole.OWNER:
        if not current_user.location_ids:
            return []
        stmt = stmt.where(Location.id.in_(current_user.location_ids))
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Location:
    assert_location_access(current_user, location_id)
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    payload: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER)),
) -> Location:
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    updates = payload.model_dump(exclude_unset=True)
    previous = {k: getattr(location, k) for k in updates}
    for key, value in updates.items():
        setattr(location, key, value)

    await record_audit(
        db,
        action="location.update",
        entity_type="location",
        entity_id=location.id,
        user_id=current_user.id,
        location_id=location.id,
        previous_values=previous,
        new_values=updates,
    )
    await db.commit()
    await db.refresh(location)
    return location
