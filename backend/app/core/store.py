from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.database import SessionLocal
from app.models import DonationORM, ImpactLogORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM


class InMemoryStore:
    users: Dict[str, Dict[str, Any]] = {}
    donor_profiles: Dict[str, Dict[str, Any]] = {}
    recipient_profiles: Dict[str, Dict[str, Any]] = {}
    donations: Dict[str, Dict[str, Any]] = {}
    matches: Dict[str, Dict[str, Any]] = {}
    notifications: Dict[str, Dict[str, Any]] = {}
    impact_logs: Dict[str, Dict[str, Any]] = {}

    def __init__(self) -> None:
        self.refresh_from_db()

    def refresh_from_db(self) -> None:
        with SessionLocal() as db:
            self.users = {row.id: self._user_from_row(row) for row in db.query(UserORM).all()}
            self.recipient_profiles = {
                row.user_id: self._recipient_profile_from_row(row) for row in db.query(RecipientProfileORM).all()
            }
            self.donations = {row.id: self._donation_from_row(row) for row in db.query(DonationORM).all()}
            self.matches = {row.id: self._match_from_row(row) for row in db.query(MatchORM).all()}
            self.notifications = {row.id: self._notification_from_row(row) for row in db.query(NotificationORM).all()}
            self.impact_logs = {row.id: self._impact_log_from_row(row) for row in db.query(ImpactLogORM).all()}

    def sync_users(self) -> None:
        self._sync_table(UserORM, self.users, self._user_to_row, self._user_from_row)

    def sync_donations(self) -> None:
        self._sync_table(DonationORM, self.donations, self._donation_to_row, self._donation_from_row)
        with SessionLocal() as db:
            for row in db.query(DonationORM).all():
                self.donations[row.id] = self._donation_from_row(row)

    def sync_recipient_profiles(self) -> None:
        with SessionLocal() as db:
            for user_id, profile in self.recipient_profiles.items():
                row = db.query(RecipientProfileORM).filter_by(user_id=user_id).first()
                payload = self._recipient_profile_to_row(profile)
                if row is None:
                    db.add(RecipientProfileORM(**payload))
                else:
                    for key, value in payload.items():
                        setattr(row, key, value)
            db.commit()

    def sync_matches(self) -> None:
        self._sync_table(MatchORM, self.matches, self._match_to_row, self._match_from_row)
        with SessionLocal() as db:
            for row in db.query(MatchORM).all():
                self.matches[row.id] = self._match_from_row(row)

    def sync_notifications(self) -> None:
        self._sync_table(NotificationORM, self.notifications, self._notification_to_row, self._notification_from_row)
        with SessionLocal() as db:
            for row in db.query(NotificationORM).all():
                self.notifications[row.id] = self._notification_from_row(row)

    def sync_impact_logs(self) -> None:
        self._sync_table(ImpactLogORM, self.impact_logs, self._impact_log_to_row, self._impact_log_from_row)
        with SessionLocal() as db:
            for row in db.query(ImpactLogORM).all():
                self.impact_logs[row.id] = self._impact_log_from_row(row)

    def sync_all(self) -> None:
        self.sync_users()
        self.sync_donations()
        self.sync_recipient_profiles()
        self.sync_matches()
        self.sync_notifications()
        self.sync_impact_logs()

    def sync_transaction(self, *sync_specs: tuple[type, Dict[str, Dict[str, Any]], Any]) -> None:
        """Atomically persist multiple entity collections within a single database transaction."""
        with SessionLocal() as db:
            with db.begin():
                for model, records, convert_fn in sync_specs:
                    for item_id, item in records.items():
                        row = db.get(model, item_id)
                        payload = convert_fn(item)
                        if row is None:
                            row = model(**payload)
                            db.add(row)
                        else:
                            row_status = getattr(row, "status", None)
                            mem_status = item.get("status")
                            if row_status in ("RESERVED", "COMPLETED", "CANCELLED") and mem_status == "AVAILABLE":
                                continue
                            row_updated = getattr(row, "updated_at", None)
                            mem_updated = item.get("updated_at")
                            if row_updated and mem_updated and isinstance(mem_updated, datetime):
                                r_u = row_updated if row_updated.tzinfo else row_updated.replace(tzinfo=timezone.utc)
                                m_u = mem_updated if mem_updated.tzinfo else mem_updated.replace(tzinfo=timezone.utc)
                                if r_u > m_u:
                                    continue
                            for key, value in payload.items():
                                setattr(row, key, value)

    def _sync_table(self, model, records: Dict[str, Dict[str, Any]], convert_fn, from_row_fn=None) -> None:
        with SessionLocal() as db:
            for item_id, item in list(records.items()):
                row = db.get(model, item_id)
                if row is None:
                    # Protection against resurrected records:
                    # For migrated models where PostgreSQL is authoritative,
                    # records deleted or non-existent in the database must never be inserted from memory.
                    if model in (UserORM, RecipientProfileORM, DonationORM, MatchORM, NotificationORM, ImpactLogORM):
                        records.pop(item_id, None)
                        continue
                    row = model(**convert_fn(item))
                    db.add(row)
                else:
                    # Protection against stale in-memory overwrite of database-authoritative state:
                    # For migrated models (UserORM, RecipientProfileORM, DonationORM, MatchORM, NotificationORM, ImpactLogORM), PostgreSQL is the source of truth.
                    # Never overwrite an existing database row from memory; heal the memory cache from DB instead.
                    if model in (UserORM, RecipientProfileORM, DonationORM, MatchORM, NotificationORM, ImpactLogORM):
                        if from_row_fn:
                            records[item_id] = from_row_fn(row)
                        continue

                    # 1. State lifecycle progression protection: RESERVED/COMPLETED/CANCELLED cannot be reverted to AVAILABLE
                    row_status = getattr(row, "status", None)
                    mem_status = item.get("status")
                    if row_status in ("RESERVED", "COMPLETED", "CANCELLED") and mem_status == "AVAILABLE":
                        if from_row_fn:
                            records[item_id] = from_row_fn(row)
                        continue

                    # 2. Timestamp freshness protection: DB row with newer timestamp takes precedence
                    row_updated = getattr(row, "updated_at", None)
                    mem_updated = item.get("updated_at")
                    if row_updated and mem_updated and isinstance(mem_updated, datetime):
                        r_u = row_updated if row_updated.tzinfo else row_updated.replace(tzinfo=timezone.utc)
                        m_u = mem_updated if mem_updated.tzinfo else mem_updated.replace(tzinfo=timezone.utc)
                        if r_u >= m_u:
                            if from_row_fn:
                                records[item_id] = from_row_fn(row)
                            continue

                    for key, value in convert_fn(item).items():
                        setattr(row, key, value)
            db.commit()

    @staticmethod
    def _user_from_row(row: UserORM) -> Dict[str, Any]:
        return {
            "id": row.id,
            "email": row.email,
            "password_hash": row.password_hash,
            "role": row.role,
            "organization_name": row.organization_name,
            "phone": row.phone,
            "address": row.address,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "is_verified": row.is_verified,
        }

    @staticmethod
    def _user_to_row(user: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": user["id"],
            "email": user["email"],
            "password_hash": user["password_hash"],
            "role": user["role"],
            "organization_name": user["organization_name"],
            "phone": user.get("phone"),
            "address": user.get("address"),
            "latitude": user.get("latitude"),
            "longitude": user.get("longitude"),
            "is_verified": user.get("is_verified", False),
        }

    @staticmethod
    def _donation_from_row(row: DonationORM) -> Dict[str, Any]:
        return {
            "id": row.id,
            "provider_id": row.provider_id,
            "title": row.title,
            "food_type": row.food_type,
            "perishable": row.perishable,
            "quantity_meals": row.quantity_meals,
            "prepared_at": row.prepared_at,
            "expiry_time": row.expiry_time,
            "pickup_address": row.pickup_address,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "special_instructions": row.special_instructions,
            "status": row.status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    @staticmethod
    def _donation_to_row(donation: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": donation["id"],
            "provider_id": donation["provider_id"],
            "title": donation["title"],
            "food_type": donation["food_type"],
            "perishable": donation.get("perishable", True),
            "quantity_meals": donation["quantity_meals"],
            "prepared_at": donation["prepared_at"],
            "expiry_time": donation["expiry_time"],
            "pickup_address": donation["pickup_address"],
            "latitude": donation["latitude"],
            "longitude": donation["longitude"],
            "special_instructions": donation.get("special_instructions"),
            "status": donation["status"],
            "created_at": donation.get("created_at"),
            "updated_at": donation.get("updated_at"),
        }

    @staticmethod
    def _recipient_profile_from_row(row: RecipientProfileORM) -> Dict[str, Any]:
        try:
            storage = json.loads(row.storage_types)
        except Exception:
            try:
                storage = json.loads(row.storage_types.replace("'", '"'))
            except Exception:
                storage = ["DRY"]
        return {
            "id": row.id,
            "user_id": row.user_id,
            "org_type": row.org_type,
            "daily_capacity_meals": row.daily_capacity_meals,
            "storage_types": storage if isinstance(storage, list) else ["DRY"],
            "dietary_preferences": row.dietary_preferences,
            "max_travel_distance_km": row.max_travel_distance_km,
            "operating_hours": row.operating_hours,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }


    @staticmethod
    def _recipient_profile_to_row(profile: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": profile["id"],
            "user_id": profile["user_id"],
            "org_type": profile.get("org_type", "SHELTER"),
            "daily_capacity_meals": profile.get("daily_capacity_meals", 100),
            "storage_types": json.dumps(profile.get("storage_types", ["DRY"])),
            "dietary_preferences": profile.get("dietary_preferences", "ALL"),
            "max_travel_distance_km": profile.get("max_travel_distance_km", 15.0),
            "operating_hours": profile.get("operating_hours"),
            "created_at": profile.get("created_at"),
            "updated_at": profile.get("updated_at"),
        }

    @staticmethod
    def _match_from_row(row: MatchORM) -> Dict[str, Any]:
        return {
            "id": row.id,
            "donation_id": row.donation_id,
            "recipient_id": row.recipient_id,
            "compatibility_score": row.compatibility_score,
            "distance_km": row.distance_km,
            "matched_factors": json.loads(row.matched_factors) if row.matched_factors else None,
            "status": row.status,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }

    @staticmethod
    def _match_to_row(match: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": match["id"],
            "donation_id": match["donation_id"],
            "recipient_id": match["recipient_id"],
            "compatibility_score": match.get("compatibility_score", 0.0),
            "distance_km": match.get("distance_km", 0.0),
            "matched_factors": json.dumps(match.get("matched_factors")) if match.get("matched_factors") is not None else None,
            "status": match["status"],
            "created_at": match.get("created_at"),
            "updated_at": match.get("updated_at"),
        }

    @staticmethod
    def _notification_from_row(row: NotificationORM) -> Dict[str, Any]:
        return {
            "id": row.id,
            "user_id": row.user_id,
            "match_id": row.match_id,
            "title": row.title,
            "message": row.message,
            "type": row.type,
            "is_read": row.is_read,
            "created_at": row.created_at,
        }

    @staticmethod
    def _notification_to_row(notification: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": notification["id"],
            "user_id": notification["user_id"],
            "match_id": notification.get("match_id"),
            "title": notification["title"],
            "message": notification["message"],
            "type": notification["type"],
            "is_read": notification.get("is_read", False),
            "created_at": notification.get("created_at"),
        }

    @staticmethod
    def _impact_log_from_row(row: ImpactLogORM) -> Dict[str, Any]:
        return {
            "id": row.id,
            "donation_id": row.donation_id,
            "match_id": row.match_id,
            "meals_rescued": row.meals_rescued,
            "food_weight_kg": row.food_weight_kg,
            "co2_savings_kg": row.co2_savings_kg,
            "created_at": row.created_at,
        }

    @staticmethod
    def _impact_log_to_row(impact: Dict[str, Any]) -> Dict[str, Any]:
        ca = impact.get("created_at")
        if isinstance(ca, str):
            try:
                ca = datetime.fromisoformat(ca)
            except Exception:
                ca = datetime.now(timezone.utc)
        elif ca is None:
            ca = datetime.now(timezone.utc)
        return {
            "id": impact["id"],
            "donation_id": impact["donation_id"],
            "match_id": impact["match_id"],
            "meals_rescued": impact["meals_rescued"],
            "food_weight_kg": impact["food_weight_kg"],
            "co2_savings_kg": impact["co2_savings_kg"],
            "created_at": ca,
        }


store = InMemoryStore()
