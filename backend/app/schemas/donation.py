from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

FoodType = Literal["VEGETARIAN_COOKED", "NON_VEGETARIAN_COOKED", "PACKAGED_GROCERY", "PRODUCE_RAW", "BAKERY"]
DonationStatus = Literal["AVAILABLE", "RESERVED", "COMPLETED", "EXPIRED", "CANCELLED"]


class DonationCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    food_type: FoodType
    perishable: bool = True
    quantity_meals: int = Field(gt=0)
    prepared_at: datetime
    expiry_time: datetime
    pickup_address: str = Field(min_length=5, max_length=500)
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    special_instructions: str | None = None


class DonationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider_id: str
    provider_org: str | None = None
    provider_address: str | None = None
    provider_phone: str | None = None
    title: str
    food_type: FoodType
    perishable: bool
    quantity_meals: int
    prepared_at: datetime
    expiry_time: datetime
    pickup_address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    special_instructions: str | None = None
    status: DonationStatus
    reserved_recipient_id: str | None = None
    reserved_recipient_name: str | None = None
    reservation_deadline: datetime | None = None
    created_at: datetime
    updated_at: datetime
