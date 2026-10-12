from __future__ import annotations

from typing import Any

from app.core.security import create_access_token, hash_password, verify_password
from app.core.store import store


class AuthService:
    @staticmethod
    def register_user(payload: dict[str, Any]) -> dict[str, Any]:
        email = payload["email"].lower()
        existing = next((user for user in store.users.values() if user["email"].lower() == email), None)
        if existing:
            raise ValueError("Email already registered")

        if payload.get("role") == "ADMIN":
            raise ValueError("Admin self-registration is not allowed")

        user_id = f"usr_{len(store.users) + 1:06d}"
        user = {
            "id": user_id,
            "email": email,
            "password_hash": hash_password(payload["password"]),
            "role": payload["role"],
            "organization_name": payload["organization_name"],
            "phone": payload["phone"],
            "address": payload["address"],
            "latitude": payload["latitude"],
            "longitude": payload["longitude"],
            "is_verified": False,
        }
        store.users[user_id] = user
        store.sync_users()
        return user

    @staticmethod
    def login_user(email: str, password: str) -> dict[str, Any]:
        user = next((item for item in store.users.values() if item["email"].lower() == email.lower()), None)
        if user is None or not verify_password(password, user["password_hash"]):
            raise ValueError("Invalid email or password")
        return user

    @staticmethod
    def create_token_for_user(user: dict[str, Any]) -> str:
        return create_access_token(user["id"])
