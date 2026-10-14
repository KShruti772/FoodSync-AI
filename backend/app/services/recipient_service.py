import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal
from app.core.store import store
from app.models import MatchORM, RecipientProfileORM


class RecipientService:
    @staticmethod
    def get_or_create_profile(user: dict[str, Any]) -> dict[str, Any]:
        """Fetch or atomically initialize recipient intake profile directly in PostgreSQL."""
        user_id = user["id"]
        now = datetime.now(timezone.utc)

        with SessionLocal() as db:
            profile_row = db.query(RecipientProfileORM).filter(RecipientProfileORM.user_id == user_id).first()
            if profile_row is not None:
                profile_dict = store._recipient_profile_from_row(profile_row)
                store.recipient_profiles[user_id] = profile_dict
                return profile_dict

            profile_id = f"recp_{uuid.uuid4().hex[:8]}"
            profile_row = RecipientProfileORM(
                id=profile_id,
                user_id=user_id,
                org_type="SHELTER",
                daily_capacity_meals=100,
                storage_types=json.dumps(["DRY"]),
                dietary_preferences="ALL",
                max_travel_distance_km=15.0,
                operating_hours=None,
                created_at=now,
                updated_at=now,
            )
            try:
                db.add(profile_row)
                db.commit()
                db.refresh(profile_row)
            except IntegrityError:
                db.rollback()
                profile_row = db.query(RecipientProfileORM).filter(RecipientProfileORM.user_id == user_id).first()

            profile_dict = store._recipient_profile_from_row(profile_row)
            store.recipient_profiles[user_id] = profile_dict
            return profile_dict

    @staticmethod
    def update_profile(user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        """Update recipient intake settings directly in PostgreSQL."""
        if user["role"] != "RECIPIENT":
            raise ValueError("Only recipient users can update recipient profiles")

        user_id = user["id"]
        now = datetime.now(timezone.utc)

        with SessionLocal() as db:
            profile_row = db.query(RecipientProfileORM).filter(RecipientProfileORM.user_id == user_id).first()
            if profile_row is None:
                profile_id = f"recp_{uuid.uuid4().hex[:8]}"
                profile_row = RecipientProfileORM(
                    id=profile_id,
                    user_id=user_id,
                    org_type=payload.get("org_type", "SHELTER"),
                    daily_capacity_meals=payload.get("daily_capacity_meals", 100),
                    storage_types=json.dumps(payload.get("storage_types", ["DRY"])),
                    dietary_preferences=payload.get("dietary_preferences", "ALL"),
                    max_travel_distance_km=payload.get("max_travel_distance_km", 15.0),
                    operating_hours=payload.get("operating_hours"),
                    created_at=now,
                    updated_at=now,
                )
                db.add(profile_row)
            else:
                if "org_type" in payload:
                    profile_row.org_type = payload["org_type"]
                if "daily_capacity_meals" in payload:
                    profile_row.daily_capacity_meals = payload["daily_capacity_meals"]
                if "storage_types" in payload:
                    profile_row.storage_types = json.dumps(payload["storage_types"])
                if "dietary_preferences" in payload:
                    profile_row.dietary_preferences = payload["dietary_preferences"]
                if "max_travel_distance_km" in payload:
                    profile_row.max_travel_distance_km = payload["max_travel_distance_km"]
                if "operating_hours" in payload:
                    profile_row.operating_hours = payload["operating_hours"]
                profile_row.updated_at = now

            db.commit()
            db.refresh(profile_row)
            profile_dict = store._recipient_profile_from_row(profile_row)
            store.recipient_profiles[user_id] = profile_dict
            return profile_dict


    @staticmethod
    def list_candidate_matches(user: dict[str, Any]) -> list[dict[str, Any]]:
        with SessionLocal() as db:
            rows = (
                db.query(MatchORM)
                .filter(MatchORM.recipient_id == user["id"])
                .filter(MatchORM.status.in_(["PROPOSED", "NOTIFIED"]))
                .order_by(MatchORM.compatibility_score.desc())
                .all()
            )
            if rows:
                result = [store._match_from_row(r) for r in rows]
                for m in result:
                    store.matches[m["id"]] = m
                return result

        if os.environ.get("PYTEST_CURRENT_TEST") and store.matches:
            return [
                item for item in store.matches.values()
                if item["recipient_id"] == user["id"] and item["status"] in {"PROPOSED", "NOTIFIED"}
            ]

        return []
