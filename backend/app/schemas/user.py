from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=150)
    phone: str | None = None
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole
    can_access_all_locations: bool | None = None
    location_ids: list[int] = Field(default_factory=list)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    can_access_all_locations: bool | None = None
    location_ids: list[int] | None = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    phone: str | None
    role: UserRole
    is_active: bool
    can_access_all_locations: bool
    location_ids: list[int]
    created_at: datetime
    updated_at: datetime

