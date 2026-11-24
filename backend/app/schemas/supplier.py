from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SupplierCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=40)
    name: str = Field(..., min_length=2, max_length=200)
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    license_number: str | None = None
    payment_terms_days: int = Field(default=30, ge=0)
    opening_balance: Decimal = Field(default=Decimal("0.00"), ge=0)


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    license_number: str | None = None
    payment_terms_days: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    contact_person: str | None
    phone: str | None
    email: str | None
    address: str | None
    license_number: str | None
    payment_terms_days: int
    opening_balance: Decimal
    current_balance: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

