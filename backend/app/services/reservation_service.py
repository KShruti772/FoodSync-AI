from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.store import store


class ReservationService:
    @staticmethod
    def accept_match(match_id: str, recipient_id: str) -> dict[str, Any]:
        match = store.matches.get(match_id)
        if match is None:
            raise ValueError("Match not found")
        if match["recipient_id"] != recipient_id:
            raise ValueError("You are not assigned to this match")
        donation = store.donations.get(match["donation_id"])
        if donation is None:
            raise ValueError("Donation not found")
        if donation["status"] != "AVAILABLE":
            raise ValueError("Donation is no longer available")

        donation["status"] = "RESERVED"
        donation["updated_at"] = datetime.now(timezone.utc)
        match["status"] = "ACCEPTED"
        match["updated_at"] = datetime.now(timezone.utc)

        for item in store.matches.values():
            if item["donation_id"] == donation["id"] and item["id"] != match_id:
                item["status"] = "EXPIRED"
                item["updated_at"] = datetime.now(timezone.utc)

        notification = {
            "id": f"notif_{len(store.notifications) + 1}_{recipient_id}",
            "user_id": recipient_id,
            "match_id": match_id,
            "title": "Donation reserved",
            "message": f"You reserved the donation: {donation['title']}",
            "type": "RESERVATION_CONFIRMATION",
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
        store.notifications[notification["id"]] = notification
        store.sync_donations()
        store.sync_matches()
        store.sync_notifications()
        return match

    @staticmethod
    def reject_match(match_id: str, recipient_id: str) -> dict[str, Any]:
        match = store.matches.get(match_id)
        if match is None:
            raise ValueError("Match not found")
        if match["recipient_id"] != recipient_id:
            raise ValueError("You are not assigned to this match")
        match["status"] = "REJECTED"
        match["updated_at"] = datetime.now(timezone.utc)
        store.sync_matches()
        return match
