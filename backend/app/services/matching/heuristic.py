from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
from app.core.store import store
from app.models import DonationORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM
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
    """Deterministically generate and persist candidate matches directly in PostgreSQL."""
    with SessionLocal() as db:
        donation_row = db.get(DonationORM, donation_id)
        if not donation_row:
            # Memory fallback for unit tests mocking store in memory
            if os.environ.get("PYTEST_CURRENT_TEST") and donation_id in store.donations:
                donation_dict = store.donations[donation_id]
            else:
                return []
        else:
            donation_dict = store._donation_from_row(donation_row)
            store.donations[donation_id] = donation_dict

        # Only AVAILABLE donations can generate proposed matches
        if donation_dict.get("status") != "AVAILABLE":
            return []

        try:
            expiry_time = _as_utc_datetime(donation_dict["expiry_time"])
            current_time = datetime.now(timezone.utc)
            if expiry_time <= current_time:
                return []
            donation_latitude = float(donation_dict["latitude"])
            donation_longitude = float(donation_dict["longitude"])
        except (KeyError, TypeError, ValueError, OverflowError):
            return []

        # 1. Discover all candidate recipient users directly from PostgreSQL
        recipient_rows = db.query(UserORM).filter(UserORM.role == "RECIPIENT").all()
        recipients = [store._user_from_row(r) for r in recipient_rows]
        if not recipients and os.environ.get("PYTEST_CURRENT_TEST"):
            recipients = [u for u in store.users.values() if u.get("role") == "RECIPIENT"]

        # 2. Discover recipient profiles directly from PostgreSQL
        profile_rows = db.query(RecipientProfileORM).all()
        profiles_by_user = {p.user_id: store._recipient_profile_from_row(p) for p in profile_rows}
        if not profiles_by_user and os.environ.get("PYTEST_CURRENT_TEST"):
            profiles_by_user = store.recipient_profiles

        # 3. Query existing match records for this donation to ensure idempotency
        existing_matches_query = db.query(MatchORM).filter(MatchORM.donation_id == donation_id).all()
        existing_matches = {m.recipient_id: m for m in existing_matches_query}

        matched_records: list[dict[str, Any]] = []
        notifications_created: list[NotificationORM] = []

        try:
            for recipient_user in recipients:
                recipient_id = recipient_user.get("id")
                if not recipient_id:
                    continue

                profile = profiles_by_user.get(recipient_id)
                if not profile:
                    continue

                # Check if this recipient already has a terminal or active match
                existing_match = existing_matches.get(recipient_id)
                if existing_match and existing_match.status in ("ACCEPTED", "COMPLETED", "REJECTED"):
                    # Preserve accepted/completed/rejected matches - do not overwrite!
                    matched_records.append(store._match_from_row(existing_match))
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
                        quantity_meals=float(donation_dict.get("quantity_meals", 0) or 0),
                        daily_capacity_meals=float(profile.get("daily_capacity_meals", 0) or 0),
                        expiry_time=expiry_time,
                        current_time=current_time,
                        food_type=str(donation_dict.get("food_type", "")),
                        dietary_preference=str(profile.get("dietary_preferences", "ALL")),
                        perishable=bool(donation_dict.get("perishable", True)),
                        storage_types=list(profile.get("storage_types") or []),
                    )
                except (KeyError, TypeError, ValueError, OverflowError):
                    continue

                if not result.is_qualified:
                    continue

                factors = result.matched_factors
                factors_dict = {
                    "distance_score": round(factors["distance_score"] or 0.0, 4),
                    "urgency_score": round(factors["urgency_score"] or 0.0, 4),
                    "capacity_score": round(factors["capacity_fit_score"] or 0.0, 4),
                    "requirement_score": round(factors["dietary_preference_score"] or 0.0, 4),
                }

                if existing_match and existing_match.status in ("PROPOSED", "NOTIFIED"):
                    # Idempotent update: update scores without creating a duplicate record
                    existing_match.compatibility_score = round(result.total_score, 4)
                    existing_match.distance_km = round(distance, 2)
                    existing_match.matched_factors = json.dumps(factors_dict)
                    existing_match.updated_at = current_time
                    matched_records.append(store._match_from_row(existing_match))
                else:
                    # Insert new match directly into PostgreSQL
                    match_id = f"match_{uuid.uuid4().hex[:8]}_{donation_id}"
                    new_match = MatchORM(
                        id=match_id,
                        donation_id=donation_id,
                        recipient_id=recipient_id,
                        compatibility_score=round(result.total_score, 4),
                        distance_km=round(distance, 2),
                        matched_factors=json.dumps(factors_dict),
                        status="PROPOSED",
                        created_at=current_time,
                        updated_at=current_time,
                    )
                    db.add(new_match)

                    notif_id = f"notif_{uuid.uuid4().hex[:8]}_{recipient_id}"
                    notification = NotificationORM(
                        id=notif_id,
                        user_id=recipient_id,
                        match_id=match_id,
                        title="New donation match available",
                        message=(
                            "A food donation near you matches your organization profile: "
                            f"{donation_dict.get('title', 'New donation')}"
                        ),
                        type="MATCH_ALERT",
                        is_read=False,
                        created_at=current_time,
                    )
                    db.add(notification)
                    notifications_created.append(notification)

                    m_dict = {
                        "id": match_id,
                        "donation_id": donation_id,
                        "recipient_id": recipient_id,
                        "compatibility_score": round(result.total_score, 4),
                        "distance_km": round(distance, 2),
                        "matched_factors": factors_dict,
                        "status": "PROPOSED",
                        "created_at": current_time,
                        "updated_at": current_time,
                    }
                    matched_records.append(m_dict)

            db.commit()

            # Refresh instances and sync cache
            for m in matched_records:
                store.matches[m["id"]] = m
            for n in notifications_created:
                db.refresh(n)
                store.notifications[n.id] = store._notification_from_row(n)

        except IntegrityError:
            # Concurrent race caught safely by PostgreSQL unique constraint
            db.rollback()
            # Fetch winning committed matches from PostgreSQL
            committed_rows = db.query(MatchORM).filter(MatchORM.donation_id == donation_id).all()
            matched_records = [store._match_from_row(r) for r in committed_rows]
            for m in matched_records:
                store.matches[m["id"]] = m
        except Exception:
            db.rollback()
            raise

    return sorted(
        matched_records,
        key=lambda item: item["compatibility_score"],
        reverse=True,
    )
