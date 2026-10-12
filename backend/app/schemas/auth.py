from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["FOOD_PROVIDER", "RECIPIENT", "ADMIN"]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role = "FOOD_PROVIDER"
    organization_name: str = Field(min_length=2, max_length=255)
    phone: str = Field(min_length=8, max_length=32)
    address: str = Field(min_length=5, max_length=500)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    role: Role
    organization_name: str
    phone: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    user: UserPublic
    token: str
