from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.core.store import store
from app.services.matching.engine import evaluate_candidate_match
from app.utils.geo import haversine_km


def _as_utc_datetime(value: Any) -> datetime:
    """Parse a datetime and normalize naive values to UTC."""
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if not isinstance(value, datetime):
        raise ValueError("Invalid donation expiry_time")
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def generate_matches_for_donation(donation_id: str) -> list[dict[str, Any]]:
    donation = store.donations.get(donation_id)
    if not donation:
        return []

    try:
        expiry_time = _as_utc_datetime(donation["expiry_time"])
        current_time = datetime.now(timezone.utc)
        donation_latitude = float(donation["latitude"])
        donation_longitude = float(donation["longitude"])
    except (KeyError, TypeError, ValueError, OverflowError):
        return []

    matches: list[dict[str, Any]] = []

    for recipient_user in store.users.values():
        if recipient_user.get("role") != "RECIPIENT":
            continue

        recipient_id = recipient_user.get("id")
        if not recipient_id:
            continue

        profile = store.recipient_profiles.get(recipient_id)
        if not profile:
            continue

        try:
            recipient_latitude = float(recipient_user["latitude"])
            recipient_longitude = float(recipient_user["longitude"])
            max_distance = float(profile.get("max_travel_distance_km", 15.0))
            distance = haversine_km(
                donation_latitude,
                donation_longitude,
                recipient_latitude,
                recipient_longitude,
            )

            result = evaluate_candidate_match(
                distance_km=distance,
                recipient_max_travel_distance_km=max_distance,
                quantity_meals=float(donation.get("quantity_meals", 0) or 0),
                daily_capacity_meals=float(
                    profile.get("daily_capacity_meals", 0) or 0
                ),
                expiry_time=expiry_time,
                current_time=current_time,
                food_type=str(donation.get("food_type", "")),
                dietary_preference=str(
                    profile.get("dietary_preferences", "ALL")
                ),
                perishable=bool(donation.get("perishable", True)),
                storage_types=list(profile.get("storage_types") or []),
            )
        except (KeyError, TypeError, ValueError, OverflowError):
            # Invalid candidate data must not break matching for other recipients.
            continue

        if not result.is_qualified:
            continue

        factors = result.matched_factors
        match_record = {
            "id": f"match_{len(store.matches) + 1}_{donation_id}",
            "donation_id": donation_id,
            "recipient_id": recipient_id,
            "compatibility_score": round(result.total_score, 4),
            "distance_km": round(distance, 2),
            # Preserve the existing API/storage keys.
            "matched_factors": {
                "distance_score": round(factors["distance_score"] or 0.0, 4),
                "urgency_score": round(factors["urgency_score"] or 0.0, 4),
                "capacity_score": round(
                    factors["capacity_fit_score"] or 0.0, 4
                ),
                "requirement_score": round(
                    factors["dietary_preference_score"] or 0.0, 4
                ),
            },
            "status": "PROPOSED",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        store.matches[match_record["id"]] = match_record
        matches.append(match_record)

        notification = {
            "id": f"notif_{len(store.notifications) + 1}_{recipient_id}",
            "user_id": recipient_id,
            "match_id": match_record["id"],
            "title": "New donation match available",
            "message": (
                "A food donation near you matches your organization profile: "
                f"{donation.get('title', 'New donation')}"
            ),
            "type": "MATCH_ALERT",
            "is_read": False,
            "created_at": datetime.now(timezone.utc),
        }
        store.notifications[notification["id"]] = notification

    store.sync_matches()
    store.sync_notifications()
    return sorted(
        matches,
        key=lambda item: item["compatibility_score"],
        reverse=True,
    )
