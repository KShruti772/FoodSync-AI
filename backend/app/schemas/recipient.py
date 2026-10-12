from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

OrgType = Literal["SHELTER", "FOOD_BANK", "COMMUNITY_KITCHEN", "ORPHANAGE"]
DietaryPreference = Literal["ALL", "VEGETARIAN_ONLY", "VEGAN_ONLY"]


class RecipientProfileBase(BaseModel):
    org_type: OrgType
    daily_capacity_meals: int = Field(ge=0)
    storage_types: list[str] = Field(default_factory=lambda: ["DRY"])
    dietary_preferences: DietaryPreference = "ALL"
    max_travel_distance_km: float = Field(default=15.0, gt=0.0)
    operating_hours: str | None = None


class RecipientProfileUpdate(RecipientProfileBase):
    pass


class RecipientProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    org_type: OrgType
    daily_capacity_meals: int
    storage_types: list[str]
    dietary_preferences: DietaryPreference
    max_travel_distance_km: float
    operating_hours: str | None = None
    created_at: datetime
    updated_at: datetime
