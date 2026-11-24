from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    sku: str = Field(..., min_length=2, max_length=64)
    barcode: str | None = Field(default=None, max_length=64)
    name: str = Field(..., min_length=2, max_length=200)
    generic_name: str | None = None
    brand_name: str | None = None
    manufacturer: str | None = None
    category: str = "medicine"
    strength: str | None = None
    dosage_form: str | None = None
    pack_size: int = Field(default=1, ge=1)
    base_unit: str = "piece"
    purchase_unit: str = "box"
    purchase_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    retail_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    wholesale_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    min_stock_level: int = Field(default=10, ge=0)
    requires_prescription: bool = False
    storage_notes: str | None = None


class ProductUpdate(BaseModel):
    barcode: str | None = Field(default=None, max_length=64)
    name: str | None = Field(default=None, min_length=2, max_length=200)
    generic_name: str | None = None
    brand_name: str | None = None
    manufacturer: str | None = None
    category: str | None = None
    strength: str | None = None
    dosage_form: str | None = None
    pack_size: int | None = Field(default=None, ge=1)
    base_unit: str | None = None
    purchase_unit: str | None = None
    purchase_cost: Decimal | None = Field(default=None, ge=0)
    retail_price: Decimal | None = Field(default=None, ge=0)
    wholesale_price: Decimal | None = Field(default=None, ge=0)
    min_stock_level: int | None = Field(default=None, ge=0)
    requires_prescription: bool | None = None
    storage_notes: str | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    barcode: str | None
    name: str
    generic_name: str | None
    brand_name: str | None
    manufacturer: str | None
    category: str
    strength: str | None
    dosage_form: str | None
    pack_size: int
    base_unit: str
    purchase_unit: str
    purchase_cost: Decimal
    retail_price: Decimal
    wholesale_price: Decimal
    min_stock_level: int
    requires_prescription: bool
    storage_notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

