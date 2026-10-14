from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.core.store import store
from app.schemas.match import MatchResponse
from app.services.matching.heuristic import rank_matches
from app.services.reservation_service import ReservationService

router = APIRouter(tags=["Matches"])


@router.get("/donations/{donation_id}/matches", response_model=list[MatchResponse])
def list_donation_matches(donation_id: str, current_user: dict = Depends(get_current_active_user)):
    donation = store.donations.get(donation_id)
    if donation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "error": {"code": "NOT_FOUND", "message": "Donation not found", "details": []}})
    if current_user["role"] not in {"FOOD_PROVIDER", "ADMIN"} and donation["provider_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Not allowed to read these matches", "details": []}})
    matches = rank_matches([
        store.matches[key] for key in store.matches if store.matches[key]["donation_id"] == donation_id
    ])
    return [MatchResponse.model_validate(item) for item in matches]


@router.post("/matches/{match_id}/accept")
def accept_match(match_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        match = ReservationService.accept_match(match_id, current_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"success": False, "error": {"code": "INVALID_STATE", "message": str(exc), "details": []}}) from exc
    return {"success": True, "message": "Match accepted", "data": match}


@router.post("/matches/{match_id}/reject")
def reject_match(match_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        match = ReservationService.reject_match(match_id, current_user["id"])
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"success": False, "error": {"code": "INVALID_STATE", "message": str(exc), "details": []}}) from exc
    return {"success": True, "message": "Match rejected", "data": match}
