from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class ImpactSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_meals_rescued: int
    total_food_weight_kg: float
    total_co2_savings_kg: float
    total_completed_donations: int


class MonthlyImpactTrend(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    month: str  # YYYY-MM
    meals_rescued: int
    food_weight_kg: float
    co2_savings_kg: float
    completed_rescues: int


class ImpactRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    donation_id: str
    match_id: str
    donation_title: str
    food_type: Optional[str] = None
    completed_at: str
    meals_rescued: int
    food_weight_kg: float
    co2_savings_kg: float
    provider_id: Optional[str] = None
    provider_name: Optional[str] = None
    recipient_id: Optional[str] = None
    recipient_name: Optional[str] = None
    verification_notes: Optional[str] = None


class ImpactLedgerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    summary: ImpactSummaryResponse
    monthly_trends: list[MonthlyImpactTrend]
    records: list[ImpactRecordResponse]
    scope: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
