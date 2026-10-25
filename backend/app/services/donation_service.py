from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.store import store
from app.models import DonationORM, ImpactLogORM, MatchORM, NotificationORM, UserORM
from app.services.matching.heuristic import generate_matches_for_donation
from app.services.reservation_service import ReservationService, _as_utc


class DonationService:
    @staticmethod
    def create_donation(provider_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        provider = store.users.get(provider_id)
        if not provider or provider["role"] != "FOOD_PROVIDER":
            raise ValueError("Only food providers can create donations")

        donation_id = f"don_{uuid4().hex}"
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
            "reserved_recipient_id": None,
            "reservation_deadline": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        store.donations[donation_id] = donation
        store.sync_donations()
        generate_matches_for_donation(donation_id)
        return donation

    @staticmethod
    def list_donations(user: dict[str, Any]) -> list[dict[str, Any]]:
        ReservationService.release_expired_reservations()
        store.refresh_from_db()
        now = datetime.now(timezone.utc)
        donations = list(store.donations.values())
        if user["role"] == "FOOD_PROVIDER":
            donations = [item for item in donations if item["provider_id"] == user["id"]]
        elif user["role"] == "RECIPIENT":
            donations = [
                item
                for item in donations
                if (
                    item["status"] == "AVAILABLE"
                    and _as_utc(item["expiry_time"]) > now
                )
                or (
                    item["status"] == "RESERVED"
                    and item.get("reserved_recipient_id") == user["id"]
                )
            ]
            donations = [
                {
                    **item,
                    "pickup_address": item["pickup_address"]
                    if item["status"] == "RESERVED"
                    else None,
                    "latitude": item["latitude"] if item["status"] == "RESERVED" else None,
                    "longitude": item["longitude"] if item["status"] == "RESERVED" else None,
                    "special_instructions": item["special_instructions"]
                    if item["status"] == "RESERVED"
                    else None,
                }
                for item in donations
            ]
        elif user["role"] != "ADMIN":
            raise ValueError("You are not allowed to list donations")
        for donation in donations:
            provider = store.users.get(donation["provider_id"])
            recipient = store.users.get(donation.get("reserved_recipient_id"))
            donation["provider_org"] = provider["organization_name"] if provider else "Food provider"
            donation["reserved_recipient_name"] = (
                recipient["organization_name"] if recipient else None
            )
        return sorted(donations, key=lambda item: item["created_at"], reverse=True)

    @staticmethod
    def get_donation(donation_id: str, user: dict[str, Any]) -> dict[str, Any]:
        ReservationService.release_expired_reservations()
        store.refresh_from_db()
        donation = store.donations.get(donation_id)
        if donation is None:
            raise ValueError("Donation not found")
        if user["role"] == "FOOD_PROVIDER" and donation["provider_id"] != user["id"]:
            raise ValueError("You are not allowed to access this donation")
        if user["role"] == "RECIPIENT":
            owns_reservation = any(
                match["donation_id"] == donation_id
                and match["recipient_id"] == user["id"]
                and match["status"] == "ACCEPTED"
                for match in store.matches.values()
            )
            if donation["status"] != "RESERVED" or not owns_reservation:
                raise ValueError("Pickup details are available only to the accepting organization")
        elif user["role"] not in {"FOOD_PROVIDER", "ADMIN"}:
            raise ValueError("You are not allowed to access this donation")
        with SessionLocal() as db:
            provider = db.get(UserORM, donation["provider_id"])
        return {
            **donation,
            "provider_org": provider.organization_name if provider else None,
            "provider_address": provider.address if provider else None,
            "provider_phone": provider.phone if provider else None,
        }

    @staticmethod
    def cancel_donation(donation_id: str, user: dict[str, Any]) -> dict[str, Any]:
        donation = store.donations.get(donation_id)
        if donation is None:
            raise ValueError("Donation not found")
        if user["role"] != "ADMIN" and (
            user["role"] != "FOOD_PROVIDER" or donation["provider_id"] != user["id"]
        ):
            raise ValueError("You are not allowed to cancel this donation")
        if donation["status"] != "AVAILABLE":
            raise ValueError("Only available donations can be cancelled")
        donation["status"] = "CANCELLED"
        donation["updated_at"] = datetime.now(timezone.utc)
        store.sync_donations()
        store.refresh_from_db()
        return store.donations[donation_id]

    @staticmethod
    def complete_donation(donation_id: str, user: dict[str, Any]) -> dict[str, Any]:
        ReservationService.release_expired_reservations()
        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            donation = db.scalar(
                select(DonationORM)
                .where(DonationORM.id == donation_id)
                .with_for_update()
            )
            if donation is None:
                raise ValueError("Donation not found")
            if donation.status != "RESERVED":
                raise ValueError("Donation must have an active reservation before completion")
            match = db.scalar(
                select(MatchORM)
                .where(
                    MatchORM.donation_id == donation_id,
                    MatchORM.status == "ACCEPTED",
                )
                .with_for_update()
            )
            if (
                match is None
                or match.recipient_id != donation.reserved_recipient_id
                or match.pickup_deadline is None
                or _as_utc(match.pickup_deadline) <= now
            ):
                raise ValueError("The reservation has expired and cannot be completed")
            is_provider = user["role"] == "FOOD_PROVIDER" and donation.provider_id == user["id"]
            is_recipient = user["role"] == "RECIPIENT" and match.recipient_id == user["id"]
            if not (is_provider or is_recipient or user["role"] == "ADMIN"):
                raise ValueError("Only the donor or accepting organization can complete this donation")

            donation.status = "COMPLETED"
            donation.reserved_recipient_id = None
            donation.reservation_deadline = None
            donation.updated_at = now
            match.status = "COMPLETED"
            match.reservation_outcome = "COLLECTED"
            match.updated_at = now
            meals = int(donation.quantity_meals)
            weight = round(meals * 0.5, 2)
            db.add(
                ImpactLogORM(
                    id=f"impact_{uuid4().hex}",
                    donation_id=donation.id,
                    match_id=match.id,
                    meals_rescued=meals,
                    food_weight_kg=weight,
                    co2_savings_kg=round(weight * 2.5, 2),
                    created_at=now,
                )
            )
            for user_id, title in (
                (donation.provider_id, "Donation pickup completed"),
                (match.recipient_id, "Food collection completed"),
            ):
                db.add(
                    NotificationORM(
                        id=f"notif_{uuid4().hex}",
                        user_id=user_id,
                        match_id=match.id,
                        title=title,
                        message=f"The collection for {donation.title} was completed successfully.",
                        type="DONATION_COMPLETED",
                        is_read=False,
                        created_at=now,
                    )
                )
            db.commit()

        store.refresh_from_db()
        return store.donations[donation_id]
