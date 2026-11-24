from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.sales import PaymentMethod, SaleStatus


class SaleItemInput(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)


class SalePaymentInput(BaseModel):
    payment_method: PaymentMethod
    amount: Decimal = Field(..., gt=0)
    reference: str | None = None


class SaleCreate(BaseModel):
    location_id: int
    customer_name: str | None = None
    customer_phone: str | None = None
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    tax_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    items: list[SaleItemInput] = Field(..., min_length=1)
    payments: list[SalePaymentInput] = Field(..., min_length=1)


class SaleItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    batch_id: int
    product_name_snapshot: str
    batch_number_snapshot: str
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    line_total: Decimal


class SalePaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    payment_method: PaymentMethod
    amount: Decimal
    reference: str | None


class SaleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    location_id: int
    cashier_user_id: int
    customer_name: str | None
    customer_phone: str | None
    status: SaleStatus
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    void_reason: str | None
    voided_by_user_id: int | None
    voided_at: datetime | None
    items: list[SaleItemResponse]
    payments: list[SalePaymentResponse]
    created_at: datetime


class SaleVoidRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class SaleReturnItemInput(BaseModel):
    sale_item_id: int
    quantity: int = Field(..., gt=0)
    condition: str = "unopened"


class SaleReturnCreate(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)
    refund_method: PaymentMethod = PaymentMethod.CASH
    items: list[SaleReturnItemInput] = Field(..., min_length=1)


class SaleReturnItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sale_item_id: int
    product_id: int
    quarantine_batch_id: int
    quantity: int
    condition: str
    refund_amount: Decimal


class SaleReturnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    return_number: str
    sale_id: int
    location_id: int
    reason: str
    refund_method: PaymentMethod
    refund_amount: Decimal
    processed_by_user_id: int
    items: list[SaleReturnItemResponse]
    created_at: datetime


class DailyClosingCreate(BaseModel):
    location_id: int
    closing_date: date | None = None
    actual_cash: Decimal = Field(..., ge=0)
    actual_non_cash: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: str | None = None


class DailyClosingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    location_id: int
    closing_date: date
    transaction_count: int
    total_sales_amount: Decimal
    expected_cash: Decimal
    expected_card: Decimal
    expected_mobile_money: Decimal
    expected_bank_transfer: Decimal
    actual_cash: Decimal
    actual_non_cash: Decimal
    cash_discrepancy: Decimal
    notes: str | None
    submitted_by_user_id: int
    created_at: datetime
