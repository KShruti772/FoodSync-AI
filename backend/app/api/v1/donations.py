from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.schemas.donation import DonationCompleteRequest, DonationCreate, DonationResponse
from app.services.donation_service import DonationService

router = APIRouter(prefix="/donations", tags=["Donations"])


@router.post("", response_model=DonationResponse, status_code=status.HTTP_201_CREATED)
def create_donation(payload: DonationCreate, current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] != "FOOD_PROVIDER":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Only food providers can create donations", "details": []}})
    try:
        donation = DonationService.create_donation(current_user["id"], payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"success": False, "error": {"code": "VALIDATION_ERROR", "message": str(exc), "details": []}}) from exc
    return DonationResponse.model_validate(donation)


@router.get("", response_model=list[DonationResponse])
def list_donations(current_user: dict = Depends(get_current_active_user)):
    return [DonationResponse.model_validate(item) for item in DonationService.list_donations(current_user)]


@router.get("/{donation_id}", response_model=DonationResponse)
def get_donation(donation_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        donation = DonationService.get_donation(donation_id, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"success": False, "error": {"code": "NOT_FOUND", "message": str(exc), "details": []}}) from exc
    return DonationResponse.model_validate(donation)


@router.post("/{donation_id}/cancel")
def cancel_donation(donation_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        donation = DonationService.cancel_donation(donation_id, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"success": False, "error": {"code": "CANNOT_CANCEL", "message": str(exc), "details": []}}) from exc
    return {"success": True, "message": "Donation cancelled", "data": donation}


@router.post("/{donation_id}/complete")
def complete_donation(
    donation_id: str,
    payload: DonationCompleteRequest | None = None,
    current_user: dict = Depends(get_current_active_user),
):
    try:
        confirmed_meals = payload.confirmed_quantity_meals if payload else None
        notes = payload.notes if payload else None
        result = DonationService.complete_donation(
            donation_id,
            current_user,
            confirmed_quantity_meals=confirmed_meals,
            notes=notes,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"success": False, "error": {"code": "INVALID_STATE", "message": str(exc), "details": []}}) from exc
    donation = result["donation"]
    impact = result["impact"]
    return {
        "success": True,
        "message": "Donation completed and impact logged",
        "data": {
            "donation_id": donation["id"],
            "status": donation["status"],
            "donation": donation,
            "impact": {
                "id": impact["id"],
                "meals_served": impact["meals_rescued"],
                "meals_rescued": impact["meals_rescued"],
                "food_weight_kg": impact["food_weight_kg"],
                "co2_savings_kg": impact["co2_savings_kg"],
            },
        },
    }
