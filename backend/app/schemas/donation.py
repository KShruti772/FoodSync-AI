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
    title: str
    food_type: FoodType
    perishable: bool
    quantity_meals: int
    prepared_at: datetime
    expiry_time: datetime
    pickup_address: str
    latitude: float
    longitude: float
    special_instructions: str | None = None
    status: DonationStatus
    created_at: datetime
    updated_at: datetime


class DonationCompleteRequest(BaseModel):
    confirmed_quantity_meals: int | None = Field(default=None, gt=0)
    notes: str | None = None
