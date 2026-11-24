import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TransferStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    APPROVED = "approved"
    DISPATCHED = "dispatched"
    PARTIALLY_RECEIVED = "partially_received"
    RECEIVED = "received"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    UNDER_INVESTIGATION = "under_investigation"


class StockTransfer(Base, TimestampMixin):
    __tablename__ = "stock_transfers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transfer_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    from_location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    to_location_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[TransferStatus] = mapped_column(
        Enum(TransferStatus, values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=TransferStatus.SUBMITTED,
        index=True,
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    discrepancy_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_by_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    approved_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dispatched_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    received_by_user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["StockTransferItem"]] = relationship(
        back_populates="transfer",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class StockTransferItem(Base):
    __tablename__ = "stock_transfer_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transfer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stock_transfers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    requested_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    approved_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dispatched_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    received_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    shortage_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    transfer: Mapped[StockTransfer] = relationship(back_populates="items")
    dispatch_batches: Mapped[list["StockTransferDispatchBatch"]] = relationship(
        back_populates="transfer_item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class StockTransferDispatchBatch(Base):
    __tablename__ = "stock_transfer_dispatch_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    transfer_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("stock_transfer_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_batch_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("inventory_batches.id", ondelete="RESTRICT"), nullable=False
    )
    batch_number: Mapped[str] = mapped_column(String(80), nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    dispatched_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    received_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    transfer_item: Mapped[StockTransferItem] = relationship(back_populates="dispatch_batches")

