from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MatchStatus = Literal["PROPOSED", "NOTIFIED", "ACCEPTED", "REJECTED", "EXPIRED", "COMPLETED"]


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    donation_id: str
    recipient_id: str
    compatibility_score: float = Field(ge=0.0, le=1.0)
    distance_km: float = Field(ge=0.0)
    matched_factors: dict | None = None
    status: MatchStatus
    accepted_at: datetime | None = None
    pickup_deadline: datetime | None = None
    reservation_outcome: str | None = None
    created_at: datetime
    updated_at: datetime
