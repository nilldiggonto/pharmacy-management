from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.inventory import AdjustmentStatus, MovementType, StockStatus


class BatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    location_id: int
    product_id: int
    supplier_id: int | None
    batch_number: str
    expiry_date: date
    received_date: date
    purchase_cost: Decimal
    initial_quantity: int
    current_quantity: int
    reserved_quantity: int
    sellable_quantity: int
    status: StockStatus
    notes: str | None
    created_at: datetime


class StockMovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    location_id: int
    product_id: int
    batch_id: int
    movement_type: MovementType
    quantity_change: int
    balance_after: int
    reference_type: str | None
    reference_id: str | None
    reason: str | None
    performed_by_user_id: int | None
    created_at: datetime


class StockAdjustmentCreate(BaseModel):
    batch_id: int
    quantity_change: int
    reason: str = Field(..., min_length=3, max_length=500)
    notes: str | None = None

    @field_validator("quantity_change")
    @classmethod
    def validate_non_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("quantity_change cannot be zero")
        return v


class StockAdjustmentDecision(BaseModel):
    notes: str | None = None


class StockAdjustmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    location_id: int
    product_id: int
    batch_id: int
    quantity_change: int
    reason: str
    status: AdjustmentStatus
    requested_by_user_id: int
    approved_by_user_id: int | None
    approved_at: datetime | None
    notes: str | None
    created_at: datetime


class BatchStatusUpdate(BaseModel):
    status: StockStatus
    reason: str = Field(..., min_length=3, max_length=500)
