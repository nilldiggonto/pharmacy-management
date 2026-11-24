from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.transfer import TransferStatus


class TransferItemRequest(BaseModel):
    product_id: int
    requested_quantity: int = Field(..., gt=0)


class TransferCreate(BaseModel):
    from_location_id: int
    to_location_id: int
    reason: str | None = None
    items: list[TransferItemRequest] = Field(..., min_length=1)


class TransferApproveItem(BaseModel):
    transfer_item_id: int
    approved_quantity: int = Field(..., ge=0)


class TransferApproveRequest(BaseModel):
    items: list[TransferApproveItem] | None = None


class TransferReceiveItem(BaseModel):
    transfer_item_id: int
    received_quantity: int = Field(..., ge=0)


class TransferReceiveRequest(BaseModel):
    items: list[TransferReceiveItem] = Field(..., min_length=1)
    discrepancy_notes: str | None = None


class TransferDispatchBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_batch_id: int
    batch_number: str
    expiry_date: date
    unit_cost: Decimal
    dispatched_quantity: int
    received_quantity: int


class TransferItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    requested_quantity: int
    approved_quantity: int
    dispatched_quantity: int
    received_quantity: int
    shortage_quantity: int
    dispatch_batches: list[TransferDispatchBatchResponse]


class TransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transfer_number: str
    from_location_id: int
    to_location_id: int
    status: TransferStatus
    reason: str | None
    discrepancy_notes: str | None
    requested_by_user_id: int
    approved_by_user_id: int | None
    dispatched_by_user_id: int | None
    received_by_user_id: int | None
    dispatched_at: datetime | None
    received_at: datetime | None
    items: list[TransferItemResponse]
    created_at: datetime
