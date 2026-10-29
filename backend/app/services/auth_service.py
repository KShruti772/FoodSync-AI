from __future__ import annotations

from typing import Any
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password, verify_password
from app.core.store import store
from app.models import UserORM
from app.services.matching.heuristic import generate_matches_for_donation
from app.services.recipient_service import RecipientService


class AuthService:
    @staticmethod
    def register_user(payload: dict[str, Any]) -> dict[str, Any]:
        email = payload["email"].strip().lower()
        if payload.get("role") == "ADMIN":
            raise ValueError("Admin self-registration is not allowed")

        with SessionLocal() as db:
            existing = db.scalar(select(UserORM).where(func.lower(UserORM.email) == email))
            if existing:
                raise ValueError("Email already registered")

            user_row = UserORM(
                id=f"usr_{uuid4().hex}",
                email=email,
                password_hash=hash_password(payload["password"]),
                role=payload["role"],
                organization_name=payload["organization_name"],
                phone=payload["phone"],
                address=payload["address"],
                latitude=payload["latitude"],
                longitude=payload["longitude"],
                is_verified=False,
            )
            db.add(user_row)
            try:
                db.commit()
            except IntegrityError as exc:
                raise ValueError("Email already registered") from exc
            db.refresh(user_row)
            user = store._user_from_row(user_row)

        store.refresh_from_db()
        if user["role"] == "RECIPIENT":
            RecipientService.get_or_create_profile(user)
            for donation in store.donations.values():
                if donation["status"] == "AVAILABLE":
                    generate_matches_for_donation(donation["id"])
        return user

    @staticmethod
    def login_user(email: str, password: str) -> dict[str, Any]:
        normalized_email = email.strip().lower()
        with SessionLocal() as db:
            user_row = db.scalar(
                select(UserORM).where(func.lower(UserORM.email) == normalized_email)
            )
            if user_row is None or not verify_password(password, user_row.password_hash):
                raise ValueError("Invalid email or password")
            user = store._user_from_row(user_row)
        store.refresh_from_db()
        return user

    @staticmethod
    def create_token_for_user(user: dict[str, Any]) -> str:
        return create_access_token(user["id"])
