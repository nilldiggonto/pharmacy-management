from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.PROCUREMENT_OFFICER,
            UserRole.INVENTORY_OFFICER,
        )
    ),
) -> Product:
    existing = await db.execute(select(Product).where(Product.sku == payload.sku.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Product SKU '{payload.sku}' already exists",
        )
    if payload.barcode:
        bc = await db.execute(select(Product).where(Product.barcode == payload.barcode))
        if bc.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Barcode '{payload.barcode}' already exists",
            )

    product = Product(
        sku=payload.sku.upper(),
        barcode=payload.barcode,
        name=payload.name,
        generic_name=payload.generic_name,
        brand_name=payload.brand_name,
        manufacturer=payload.manufacturer,
        category=payload.category,
        strength=payload.strength,
        dosage_form=payload.dosage_form,
        pack_size=payload.pack_size,
        base_unit=payload.base_unit,
        purchase_unit=payload.purchase_unit,
        purchase_cost=payload.purchase_cost,
        retail_price=payload.retail_price,
        wholesale_price=payload.wholesale_price,
        min_stock_level=payload.min_stock_level,
        requires_prescription=payload.requires_prescription,
        storage_notes=payload.storage_notes,
    )
    db.add(product)
    await db.flush()

    await record_audit(
        db,
        action="product.create",
        entity_type="product",
        entity_id=product.id,
        user_id=current_user.id,
        new_values={
            "sku": product.sku,
            "name": product.name,
            "purchase_cost": str(product.purchase_cost),
            "retail_price": str(product.retail_price),
        },
    )
    await db.commit()
    await db.refresh(product)
    return product


@router.get("", response_model=list[ProductResponse])
async def list_products(
    q: str | None = Query(default=None, description="Search by name, generic, brand, SKU, or barcode"),
    category: str | None = None,
    active_only: bool = True,
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Product]:
    stmt = select(Product).order_by(Product.name.asc()).limit(limit)
    if active_only:
        stmt = stmt.where(Product.is_active.is_(True))
    if category:
        stmt = stmt.where(Product.category == category)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(pattern),
                Product.generic_name.ilike(pattern),
                Product.brand_name.ilike(pattern),
                Product.sku.ilike(pattern),
                Product.barcode.ilike(pattern),
            )
        )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Product:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.OWNER,
            UserRole.HEAD_OFFICE_MANAGER,
            UserRole.PROCUREMENT_OFFICER,
        )
    ),
) -> Product:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    updates = payload.model_dump(exclude_unset=True)
    previous = {k: str(getattr(product, k)) for k in updates}
    for key, value in updates.items():
        setattr(product, key, value)

    await record_audit(
        db,
        action="product.update",
        entity_type="product",
        entity_id=product.id,
        user_id=current_user.id,
        previous_values=previous,
        new_values={k: str(v) for k, v in updates.items()},
    )
    await db.commit()
    await db.refresh(product)
    return product
