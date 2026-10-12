from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.schemas.recipient import RecipientProfileResponse, RecipientProfileUpdate
from app.services.recipient_service import RecipientService

router = APIRouter(prefix="/recipients", tags=["Recipients"])


@router.get("/profile", response_model=RecipientProfileResponse)
def get_profile(current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] != "RECIPIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Only recipient users can access this endpoint", "details": []}})
    profile = RecipientService.get_or_create_profile(current_user)
    return RecipientProfileResponse.model_validate(profile)


@router.put("/profile", response_model=RecipientProfileResponse)
def update_profile(payload: RecipientProfileUpdate, current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] != "RECIPIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Only recipient users can update this profile", "details": []}})
    profile = RecipientService.update_profile(current_user, payload.model_dump())
    return RecipientProfileResponse.model_validate(profile)


@router.get("/matches")
def list_matches(current_user: dict = Depends(get_current_active_user)):
    if current_user["role"] != "RECIPIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"success": False, "error": {"code": "FORBIDDEN", "message": "Only recipients can access candidate matches", "details": []}})
    return {"success": True, "data": RecipientService.list_candidate_matches(current_user)}
