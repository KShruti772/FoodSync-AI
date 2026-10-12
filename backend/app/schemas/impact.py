from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImpactSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_meals_rescued: int
    total_food_weight_kg: float
    total_co2_savings_kg: float
    total_completed_donations: int
