from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.location import LocationType


class LocationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=2, max_length=40)
    location_type: LocationType = LocationType.BRANCH
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    holds_stock: bool = True
    manager_user_id: int | None = None


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    holds_stock: bool | None = None
    is_active: bool | None = None
    manager_user_id: int | None = None


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    location_type: LocationType
    address: str | None
    phone: str | None
    email: str | None
    holds_stock: bool
    is_active: bool
    manager_user_id: int | None
    created_at: datetime
    updated_at: datetime

