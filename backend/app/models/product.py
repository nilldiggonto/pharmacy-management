from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    barcode: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    generic_name: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    brand_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    manufacturer: Mapped[str | None] = mapped_column(String(150), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="medicine", index=True)
    strength: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dosage_form: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pack_size: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    base_unit: Mapped[str] = mapped_column(String(32), nullable=False, default="piece")
    purchase_unit: Mapped[str] = mapped_column(String(32), nullable=False, default="box")
    purchase_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    retail_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    wholesale_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    min_stock_level: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    storage_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
