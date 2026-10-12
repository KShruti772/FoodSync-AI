from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.store import store
from app.services.matching.heuristic import generate_matches_for_donation


class DonationService:
    @staticmethod
    def create_donation(provider_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        provider = store.users.get(provider_id)
        if not provider or provider["role"] != "FOOD_PROVIDER":
            raise ValueError("Only food providers can create donations")

        donation_id = f"don_{len(store.donations) + 1:08d}"
        donation = {
            "id": donation_id,
            "provider_id": provider_id,
            "title": payload["title"],
            "food_type": payload["food_type"],
            "perishable": payload.get("perishable", True),
            "quantity_meals": payload["quantity_meals"],
            "prepared_at": payload["prepared_at"],
            "expiry_time": payload["expiry_time"],
            "pickup_address": payload["pickup_address"],
            "latitude": payload["latitude"],
            "longitude": payload["longitude"],
            "special_instructions": payload.get("special_instructions"),
            "status": "AVAILABLE",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        store.donations[donation_id] = donation
        store.sync_donations()
        generate_matches_for_donation(donation_id)
        return donation

    @staticmethod
    def list_donations() -> list[dict[str, Any]]:
        return sorted(store.donations.values(), key=lambda item: item["created_at"], reverse=True)

    @staticmethod
    def get_donation(donation_id: str) -> dict[str, Any]:
        donation = store.donations.get(donation_id)
        if donation is None:
            raise ValueError("Donation not found")
        return donation

    @staticmethod
    def cancel_donation(donation_id: str, user: dict[str, Any]) -> dict[str, Any]:
        donation = store.donations.get(donation_id)
        if donation is None:
            raise ValueError("Donation not found")
        if user["role"] not in {"FOOD_PROVIDER", "ADMIN"} and donation["provider_id"] != user["id"]:
            raise ValueError("You are not allowed to cancel this donation")
        donation["status"] = "CANCELLED"
        donation["updated_at"] = datetime.now(timezone.utc)
        store.sync_donations()
        return donation

    @staticmethod
    def complete_donation(donation_id: str, user: dict[str, Any]) -> dict[str, Any]:
        donation = store.donations.get(donation_id)
        if donation is None:
            raise ValueError("Donation not found")
        if donation["status"] != "RESERVED":
            raise ValueError("Donation must be reserved before completion")
        donation["status"] = "COMPLETED"
        donation["updated_at"] = datetime.now(timezone.utc)
        store.sync_donations()
        return donation
