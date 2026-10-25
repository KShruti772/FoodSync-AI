from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.schemas.donation import DonationCreate, DonationResponse
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
    try:
        donations = DonationService.list_donations(current_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}}) from exc
    return [DonationResponse.model_validate(item) for item in donations]


@router.get("/{donation_id}", response_model=DonationResponse)
def get_donation(donation_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        donation = DonationService.get_donation(donation_id, current_user)
    except ValueError as exc:
        error_status = status.HTTP_404_NOT_FOUND if str(exc) == "Donation not found" else status.HTTP_403_FORBIDDEN
        error_code = "NOT_FOUND" if error_status == status.HTTP_404_NOT_FOUND else "FORBIDDEN"
        raise HTTPException(status_code=error_status, detail={"success": False, "error": {"code": error_code, "message": str(exc), "details": []}}) from exc
    return DonationResponse.model_validate(donation)


@router.post("/{donation_id}/cancel")
def cancel_donation(donation_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        donation = DonationService.cancel_donation(donation_id, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc), "details": []}}) from exc
    return {"success": True, "message": "Donation cancelled", "data": donation}


@router.post("/{donation_id}/complete")
def complete_donation(donation_id: str, current_user: dict = Depends(get_current_active_user)):
    try:
        donation = DonationService.complete_donation(donation_id, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"success": False, "error": {"code": "INVALID_STATE", "message": str(exc), "details": []}}) from exc
    return {"success": True, "message": "Donation completed", "data": donation}
