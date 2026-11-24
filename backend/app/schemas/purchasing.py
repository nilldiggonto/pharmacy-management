from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.purchasing import PurchaseOrderStatus


class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    quantity_ordered: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., ge=0)


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    destination_location_id: int
    expected_date: date | None = None
    notes: str | None = None
    items: list[PurchaseOrderItemCreate] = Field(..., min_length=1)


class PurchaseOrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity_ordered: int
    quantity_received: int
    unit_cost: Decimal


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    po_number: str
    supplier_id: int
    destination_location_id: int
    status: PurchaseOrderStatus
    expected_date: date | None
    total_amount: Decimal
    notes: str | None
    created_by_user_id: int
    approved_by_user_id: int | None
    approved_at: datetime | None
    items: list[PurchaseOrderItemResponse]
    created_at: datetime


class GoodsReceiptItemInput(BaseModel):
    po_item_id: int
    batch_number: str = Field(..., min_length=1, max_length=80)
    expiry_date: date
    quantity_received: int = Field(..., gt=0)
    damaged_quantity: int = Field(default=0, ge=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)


class GoodsReceiptCreate(BaseModel):
    supplier_invoice_number: str | None = None
    notes: str | None = None
    items: list[GoodsReceiptItemInput] = Field(..., min_length=1)


class GoodsReceiptItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    po_item_id: int
    product_id: int
    batch_id: int
    batch_number: str
    expiry_date: date
    quantity_received: int
    damaged_quantity: int
    unit_cost: Decimal


class GoodsReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    receipt_number: str
    purchase_order_id: int
    location_id: int
    supplier_id: int
    supplier_invoice_number: str | None
    received_by_user_id: int
    received_at: datetime
    notes: str | None
    items: list[GoodsReceiptItemResponse]
