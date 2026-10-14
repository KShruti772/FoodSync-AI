from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
from app.core.security import create_access_token, hash_password, verify_password
from app.core.store import store
from app.models import UserORM


class AuthService:
    @staticmethod
    def register_user(payload: dict[str, Any]) -> dict[str, Any]:
        """Register a new user directly in PostgreSQL with Argon2id password hashing."""
        email = payload["email"].strip().lower()

        if payload.get("role") == "ADMIN":
            raise ValueError("Admin self-registration is not allowed")

        now = datetime.now(timezone.utc)
        user_id = f"usr_{uuid.uuid4().hex[:8]}"

        with SessionLocal() as db:
            # Check for existing email in PostgreSQL
            existing = db.query(UserORM).filter(UserORM.email == email).first()
            if existing is not None:
                raise ValueError("Email already registered")

            password_hash = hash_password(payload["password"])

            user_row = UserORM(
                id=user_id,
                email=email,
                password_hash=password_hash,
                role=payload["role"],
                organization_name=payload["organization_name"],
                phone=payload.get("phone"),
                address=payload.get("address"),
                latitude=payload.get("latitude"),
                longitude=payload.get("longitude"),
                is_verified=False,
                created_at=now,
                updated_at=now,
            )

            try:
                db.add(user_row)
                db.commit()
                db.refresh(user_row)
            except IntegrityError as exc:
                db.rollback()
                raise ValueError("Email already registered") from exc

            user_dict = store._user_from_row(user_row)
            # Sync to local in-memory store cache for legacy dependent services
            store.users[user_id] = user_dict

        # Auto-initialize recipient profile if role is RECIPIENT
        if user_dict["role"] == "RECIPIENT":
            from app.services.recipient_service import RecipientService

            RecipientService.get_or_create_profile(user_dict)

        return user_dict

    @staticmethod
    def login_user(email: str, password: str) -> dict[str, Any]:
        """Authenticate user against PostgreSQL and verify password hash."""
        normalized_email = email.strip().lower()

        with SessionLocal() as db:
            user_row = db.query(UserORM).filter(UserORM.email == normalized_email).first()
            if user_row is None:
                raise ValueError("Invalid email or password")

            if not verify_password(password, user_row.password_hash):
                raise ValueError("Invalid email or password")

            user_dict = store._user_from_row(user_row)
            store.users[user_row.id] = user_dict
            return user_dict

    @staticmethod
    def create_token_for_user(user: dict[str, Any]) -> str:
        return create_access_token(user["id"])
