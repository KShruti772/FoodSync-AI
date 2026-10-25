from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.store import store
from app.services.matching.heuristic import rank_matches


class RecipientService:
    @staticmethod
    def get_or_create_profile(user: dict[str, Any]) -> dict[str, Any]:
        profile = store.recipient_profiles.get(user["id"])
        if profile is not None:
            return profile

        profile = {
            "id": f"recp_{len(store.recipient_profiles) + 1:06d}",
            "user_id": user["id"],
            "org_type": "SHELTER",
            "daily_capacity_meals": 100,
            "storage_types": ["DRY"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 15.0,
            "operating_hours": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        store.recipient_profiles[user["id"]] = profile
        store.sync_recipient_profiles()
        return profile

    @staticmethod
    def update_profile(user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        if user["role"] != "RECIPIENT":
            raise ValueError("Only recipient users can update recipient profiles")

        profile = store.recipient_profiles.setdefault(user["id"], {
            "id": f"recp_{len(store.recipient_profiles) + 1:06d}",
            "user_id": user["id"],
            "org_type": "SHELTER",
            "daily_capacity_meals": 100,
            "storage_types": ["DRY"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 15.0,
            "operating_hours": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        })
        for key, value in payload.items():
            if key in {"created_at", "updated_at", "id", "user_id"}:
                continue
            profile[key] = value
        profile["updated_at"] = datetime.now(timezone.utc)
        store.recipient_profiles[user["id"]] = profile
        store.sync_recipient_profiles()
        return profile

    @staticmethod
    def list_candidate_matches(user: dict[str, Any]) -> list[dict[str, Any]]:
        from app.services.reservation_service import ReservationService

        ReservationService.release_expired_reservations()
        return rank_matches([
            item for item in store.matches.values()
            if item["recipient_id"] == user["id"]
            and item["status"] in {"PROPOSED", "NOTIFIED", "ACCEPTED"}
        ])
