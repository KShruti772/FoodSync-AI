from __future__ import annotations

from fastapi import APIRouter

from app.schemas.impact import ImpactSummaryResponse
from app.services.impact_service import ImpactService

router = APIRouter(prefix="/impact", tags=["Impact"])


@router.get("/summary", response_model=ImpactSummaryResponse)
def get_impact_summary():
    return ImpactSummaryResponse.model_validate(ImpactService.summary())
