import enum

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    OWNER = "owner"
    HEAD_OFFICE_MANAGER = "head_office_manager"
    BRANCH_MANAGER = "branch_manager"
    PHARMACIST = "pharmacist"
    CASHIER = "cashier"
    INVENTORY_OFFICER = "inventory_officer"
    PROCUREMENT_OFFICER = "procurement_officer"
    ACCOUNTANT = "accountant"


GLOBAL_ACCESS_ROLES = {
    UserRole.OWNER,
    UserRole.HEAD_OFFICE_MANAGER,
    UserRole.ACCOUNTANT,
}


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_access_all_locations: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    location_assignments: Mapped[list["UserLocationAccess"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def location_ids(self) -> list[int]:
        return [link.location_id for link in self.location_assignments]


class UserLocationAccess(Base):
    __tablename__ = "user_location_access"
    __table_args__ = (UniqueConstraint("user_id", "location_id", name="uq_user_location"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("locations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    user: Mapped[User] = relationship(back_populates="location_assignments")
