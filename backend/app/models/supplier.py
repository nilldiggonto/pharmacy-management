from decimal import Decimal

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    contact_person: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    license_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payment_terms_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    opening_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))
    current_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
