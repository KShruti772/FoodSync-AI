from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_active_user
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, TokenResponse, UserPublic
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest):
    try:
        user = AuthService.register_user(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"success": False, "error": {"code": "INVALID_ROLE_OR_INPUT", "message": str(exc), "details": []}}) from exc

    token = AuthService.create_token_for_user(user)
    return {
        "user": UserPublic.model_validate(user),
        "token": token,
    }


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest):
    try:
        user = AuthService.login_user(payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail={"success": False, "error": {"code": "INVALID_CREDENTIALS", "message": "Invalid email or password", "details": []}}) from exc

    token = AuthService.create_token_for_user(user)
    return {
        "user": UserPublic.model_validate(user),
        "token": token,
    }


@router.get("/me", response_model=UserPublic)
def get_authenticated_user(current_user: dict = Depends(get_current_active_user)):
    return UserPublic.model_validate(current_user)
