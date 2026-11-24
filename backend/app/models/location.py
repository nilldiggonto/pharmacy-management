import enum

from sqlalchemy import Boolean, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class LocationType(str, enum.Enum):
    MAIN_OFFICE = "main_office"
    CENTRAL_WAREHOUSE = "central_warehouse"
    BRANCH = "branch"
    WAREHOUSE = "warehouse"


class Location(Base, TimestampMixin):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    location_type: Mapped[LocationType] = mapped_column(
        Enum(LocationType, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=LocationType.BRANCH,
    )
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    holds_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    manager_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

