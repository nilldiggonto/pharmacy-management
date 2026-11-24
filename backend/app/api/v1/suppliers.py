from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import require_roles
from app.models.supplier import Supplier
from app.models.user import User, UserRole
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

SUPPLIER_VIEW_ROLES = (
    UserRole.OWNER,
    UserRole.HEAD_OFFICE_MANAGER,
    UserRole.PROCUREMENT_OFFICER,
    UserRole.ACCOUNTANT,
    UserRole.INVENTORY_OFFICER,
)

SUPPLIER_WRITE_ROLES = (
    UserRole.OWNER,
    UserRole.HEAD_OFFICE_MANAGER,
    UserRole.PROCUREMENT_OFFICER,
)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    payload: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*SUPPLIER_WRITE_ROLES)),
) -> Supplier:
    existing = await db.execute(select(Supplier).where(Supplier.code == payload.code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Supplier code '{payload.code}' already exists",
        )

    supplier = Supplier(
        code=payload.code.upper(),
        name=payload.name,
        contact_person=payload.contact_person,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        license_number=payload.license_number,
        payment_terms_days=payload.payment_terms_days,
        opening_balance=payload.opening_balance,
        current_balance=payload.opening_balance,
    )
    db.add(supplier)
    await db.flush()

    await record_audit(
        db,
        action="supplier.create",
        entity_type="supplier",
        entity_id=supplier.id,
        user_id=current_user.id,
        new_values={"code": supplier.code, "name": supplier.name},
    )
    await db.commit()
    await db.refresh(supplier)
    return supplier


@router.get("", response_model=list[SupplierResponse])
async def list_suppliers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*SUPPLIER_VIEW_ROLES)),
) -> list[Supplier]:
    result = await db.execute(select(Supplier).order_by(Supplier.name.asc()))
    return list(result.scalars().all())


@router.patch("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*SUPPLIER_WRITE_ROLES)),
) -> Supplier:
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    updates = payload.model_dump(exclude_unset=True)
    previous = {k: getattr(supplier, k) for k in updates}
    for key, value in updates.items():
        setattr(supplier, key, value)

    await record_audit(
        db,
        action="supplier.update",
        entity_type="supplier",
        entity_id=supplier.id,
        user_id=current_user.id,
        previous_values=previous,
        new_values=updates,
    )
    await db.commit()
    await db.refresh(supplier)
    return supplier
