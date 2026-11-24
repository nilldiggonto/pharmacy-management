from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import require_roles
from app.core.security import hash_password
from app.models.location import Location
from app.models.user import GLOBAL_ACCESS_ROLES, User, UserLocationAccess, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER)),
) -> User:
    if payload.role == UserRole.OWNER and current_user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an owner can create another owner account",
        )

    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    if payload.location_ids:
        locs = await db.execute(select(Location.id).where(Location.id.in_(payload.location_ids)))
        found_ids = set(locs.scalars().all())
        missing = set(payload.location_ids) - found_ids
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid location IDs: {sorted(missing)}",
            )

    can_all = (
        payload.can_access_all_locations
        if payload.can_access_all_locations is not None
        else payload.role in GLOBAL_ACCESS_ROLES
    )

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=payload.role,
        can_access_all_locations=can_all,
    )
    db.add(user)
    await db.flush()

    for loc_id in sorted(set(payload.location_ids)):
        db.add(UserLocationAccess(user_id=user.id, location_id=loc_id))

    await record_audit(
        db,
        action="user.create",
        entity_type="user",
        entity_id=user.id,
        user_id=current_user.id,
        new_values={
            "email": user.email,
            "role": user.role.value,
            "can_access_all_locations": can_all,
            "location_ids": sorted(set(payload.location_ids)),
        },
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER, UserRole.BRANCH_MANAGER)
    ),
) -> list[User]:
    result = await db.execute(select(User).order_by(User.id))
    users = list(result.scalars().all())
    if current_user.can_access_all_locations or current_user.role == UserRole.OWNER:
        return users
    allowed = set(current_user.location_ids)
    return [u for u in users if set(u.location_ids) & allowed]


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.OWNER, UserRole.HEAD_OFFICE_MANAGER)),
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if (
        user.role == UserRole.OWNER or payload.role == UserRole.OWNER
    ) and current_user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an owner can modify owner accounts",
        )

    updates = payload.model_dump(exclude_unset=True)
    previous = {
        "full_name": user.full_name,
        "role": user.role.value,
        "is_active": user.is_active,
        "can_access_all_locations": user.can_access_all_locations,
        "location_ids": user.location_ids,
    }

    location_ids = updates.pop("location_ids", None)
    for key, value in updates.items():
        setattr(user, key, value)

    if location_ids is not None:
        if location_ids:
            locs = await db.execute(select(Location.id).where(Location.id.in_(location_ids)))
            found_ids = set(locs.scalars().all())
            missing = set(location_ids) - found_ids
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid location IDs: {sorted(missing)}",
                )
        user.location_assignments.clear()
        await db.flush()
        for loc_id in sorted(set(location_ids)):
            user.location_assignments.append(UserLocationAccess(user_id=user.id, location_id=loc_id))

    await record_audit(
        db,
        action="user.update",
        entity_type="user",
        entity_id=user.id,
        user_id=current_user.id,
        previous_values=previous,
        new_values={
            "full_name": user.full_name,
            "role": user.role.value,
            "is_active": user.is_active,
            "can_access_all_locations": user.can_access_all_locations,
            "location_ids": location_ids if location_ids is not None else previous["location_ids"],
        },
    )
    await db.commit()
    await db.refresh(user)
    return user
