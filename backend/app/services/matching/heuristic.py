from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from app.core.store import store
from app.utils.geo import haversine_km


def rank_matches(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        matches,
        key=lambda item: (
            -item["compatibility_score"],
            item["distance_km"],
            -(item.get("matched_factors") or {}).get("urgency_score", 0.0),
            item["recipient_id"],
        ),
    )


def _score_distance(distance_km: float, max_distance_km: float) -> float:
    if max_distance_km <= 0:
        return 0.0
    return max(0.0, 1.0 - (distance_km / max_distance_km))


def _score_urgency(donation: dict[str, Any]) -> float:
    expiry = donation["expiry_time"]
    if isinstance(expiry, str):
        expiry = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    hours_left = (expiry - datetime.now(timezone.utc)).total_seconds() / 3600

    if hours_left < 0.5:
        return 0.0
    if hours_left <= 2:
        return 1.0
    if hours_left <= 6:
        return 0.8
    if hours_left <= 24:
        return 0.5
    return 0.3


def _score_capacity(recipient: dict[str, Any], donation: dict[str, Any]) -> float:
    capacity = float(recipient.get("daily_capacity_meals", 0) or 0)
    quantity = float(donation.get("quantity_meals", 0) or 0)
    if capacity <= 0 or quantity <= 0:
        return 0.0
    return min(1.0, quantity / max(capacity, 1.0))


def _score_requirement(recipient: dict[str, Any], donation: dict[str, Any]) -> float:
    dietary_pref = recipient.get("dietary_preferences", "ALL")
    donation_type = donation.get("food_type")

    if dietary_pref == "ALL":
        return 1.0
    if dietary_pref == "VEGETARIAN_ONLY":
        vegetarian_types = {"VEGETARIAN_COOKED", "PACKAGED_GROCERY", "PRODUCE_RAW", "BAKERY"}
        return 1.0 if donation_type in vegetarian_types else 0.0
    if dietary_pref == "VEGAN_ONLY":
        vegan_types = {"PACKAGED_GROCERY", "PRODUCE_RAW", "BAKERY"}
        return 1.0 if donation_type in vegan_types else 0.0
    return 0.0


def generate_matches_for_donation(donation_id: str) -> list[dict[str, Any]]:
    donation = store.donations.get(donation_id)
    if not donation or donation["status"] != "AVAILABLE":
        return []

    matches: list[dict[str, Any]] = []
    for recipient_user in store.users.values():
        if recipient_user.get("role") != "RECIPIENT":
            continue
        if recipient_user.get("latitude") is None or recipient_user.get("longitude") is None:
            continue
        if any(
            match["donation_id"] == donation_id
            and match["recipient_id"] == recipient_user["id"]
            and match["status"] in {"PROPOSED", "NOTIFIED", "ACCEPTED"}
            for match in store.matches.values()
        ):
            continue

        profile = store.recipient_profiles.get(recipient_user["id"])
        if not profile:
            continue

        location = (donation["latitude"], donation["longitude"])
        recipient_location = (recipient_user["latitude"], recipient_user["longitude"])
        distance = haversine_km(location[0], location[1], recipient_location[0], recipient_location[1])
        max_allowed_distance = min(15.0, float(profile.get("max_travel_distance_km", 15.0)))

        if distance > max_allowed_distance:
            continue

        requirement = _score_requirement(profile, donation)
        if requirement <= 0:
            continue

        dist_score = _score_distance(distance, max_allowed_distance)
        urgency_score = _score_urgency(donation)
        if urgency_score <= 0:
            continue
        capacity_score = _score_capacity(profile, donation)

        total_score = round(
            0.35 * dist_score + 0.30 * urgency_score + 0.20 * capacity_score + 0.15 * requirement,
            4,
        )

        match_record = {
            "id": f"match_{uuid4().hex}",
            "donation_id": donation_id,
            "recipient_id": recipient_user["id"],
            "compatibility_score": total_score,
            "distance_km": round(distance, 2),
            "matched_factors": {
                "distance_score": round(dist_score, 4),
                "urgency_score": round(urgency_score, 4),
                "capacity_score": round(capacity_score, 4),
                "requirement_score": round(requirement, 4),
            },
            "status": "PROPOSED",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        store.matches[match_record["id"]] = match_record
        matches.append(match_record)

        notification = {
            "id": f"notif_{uuid4().hex}",
            "user_id": recipient_user["id"],
            "match_id": match_record["id"],
            "title": "New donation match available",
            "message": f"A food donation near you matches your organization profile: {donation['title']}",
            "type": "MATCH_ALERT",
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
        store.notifications[notification["id"]] = notification

    store.sync_matches()
    store.sync_notifications()
    return rank_matches(matches)
