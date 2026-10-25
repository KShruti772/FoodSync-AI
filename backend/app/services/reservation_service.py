from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import select, update

from app.core.database import SessionLocal
from app.core.store import store
from app.models import DonationORM, MatchORM, NotificationORM, UserORM

PICKUP_WINDOW = timedelta(minutes=30)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _add_notification(
    db,
    user_id: str,
    match_id: str,
    title: str,
    message: str,
    notification_type: str,
) -> None:
    db.add(
        NotificationORM(
            id=f"notif_{uuid4().hex}",
            user_id=user_id,
            match_id=match_id,
            title=title,
            message=message,
            type=notification_type,
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
    )


class ReservationService:
    @staticmethod
    def accept_match(match_id: str, recipient_id: str) -> dict[str, Any]:
        ReservationService.release_expired_reservations()
        now = datetime.now(timezone.utc)

        with SessionLocal() as db:
            match_ref = db.get(MatchORM, match_id)
            if match_ref is None:
                raise ValueError("Match not found")
            donation_id = match_ref.donation_id

            donation = db.scalar(
                select(DonationORM)
                .where(DonationORM.id == donation_id)
                .with_for_update()
            )
            if donation is None:
                raise ValueError("Donation not found")

            match = db.scalar(
                select(MatchORM)
                .where(MatchORM.id == match_id)
                .with_for_update()
            )
            recipient = db.get(UserORM, recipient_id)
            if recipient is None or recipient.role != "RECIPIENT":
                raise ValueError("Only recipient organizations can accept a match")
            if match is None:
                raise ValueError("Match not found")
            if match.recipient_id != recipient_id:
                raise ValueError("You are not assigned to this match")
            if match.status not in {"PROPOSED", "NOTIFIED"}:
                raise ValueError("This match is no longer available to accept")
            if donation.status != "AVAILABLE":
                raise ValueError("Donation is no longer available")
            if _as_utc(donation.expiry_time) <= now:
                raise ValueError("Donation has expired")

            deadline = min(now + PICKUP_WINDOW, _as_utc(donation.expiry_time))
            changed = db.execute(
                update(DonationORM)
                .where(DonationORM.id == donation_id, DonationORM.status == "AVAILABLE")
                .values(
                    status="RESERVED",
                    reserved_recipient_id=recipient_id,
                    reservation_deadline=deadline,
                    updated_at=now,
                )
            )
            if changed.rowcount != 1:
                raise ValueError("Donation is no longer available")

            match.status = "ACCEPTED"
            match.accepted_at = now
            match.pickup_deadline = deadline
            match.reservation_outcome = None
            match.updated_at = now
            _add_notification(
                db,
                recipient_id,
                match_id,
                "Donation reserved",
                f"You reserved {donation.title}. Collect it by {deadline.isoformat()}.",
                "RESERVATION_CONFIRMATION",
            )
            _add_notification(
                db,
                donation.provider_id,
                match_id,
                "Donation reserved for pickup",
                f"{recipient.organization_name} reserved {donation.title}. Collection is due by {deadline.isoformat()}.",
                "RESERVATION_CONFIRMATION",
            )
            db.commit()

        store.refresh_from_db()
        return store.matches[match_id]

    @staticmethod
    def reject_match(match_id: str, recipient_id: str) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            match = db.scalar(
                select(MatchORM)
                .where(MatchORM.id == match_id)
                .with_for_update()
            )
            if match is None:
                raise ValueError("Match not found")
            if match.recipient_id != recipient_id:
                raise ValueError("You are not assigned to this match")
            if match.status not in {"PROPOSED", "NOTIFIED"}:
                raise ValueError("This match can no longer be declined")
            match.status = "REJECTED"
            match.updated_at = now
            db.commit()

        store.refresh_from_db()
        return store.matches[match_id]

    @staticmethod
    def release_expired_reservations() -> int:
        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            candidates = db.scalars(
                select(MatchORM.id).where(
                    MatchORM.status == "ACCEPTED",
                    MatchORM.pickup_deadline.is_not(None),
                    MatchORM.pickup_deadline <= now,
                )
            ).all()

        released = 0
        for match_id in candidates:
            donation_id: str | None = None
            with SessionLocal() as db:
                match_ref = db.get(MatchORM, match_id)
                if match_ref is None:
                    continue
                donation_id = match_ref.donation_id
                donation = db.scalar(
                    select(DonationORM)
                    .where(DonationORM.id == donation_id)
                    .with_for_update()
                )
                match = db.scalar(
                    select(MatchORM)
                    .where(MatchORM.id == match_id)
                    .with_for_update()
                )
                if (
                    donation is None
                    or match is None
                    or match.status != "ACCEPTED"
                    or match.pickup_deadline is None
                    or _as_utc(match.pickup_deadline) > now
                ):
                    continue

                match.status = "EXPIRED"
                match.reservation_outcome = "TIMED_OUT"
                match.updated_at = now
                if (
                    donation.status == "RESERVED"
                    and donation.reserved_recipient_id == match.recipient_id
                ):
                    if _as_utc(donation.expiry_time) > now:
                        donation.status = "AVAILABLE"
                    else:
                        donation.status = "EXPIRED"
                    donation.reserved_recipient_id = None
                    donation.reservation_deadline = None
                    donation.updated_at = now

                recipient = db.get(UserORM, match.recipient_id)
                provider = db.get(UserORM, donation.provider_id)
                recipient_name = recipient.organization_name if recipient else "The recipient organization"
                _add_notification(
                    db,
                    match.recipient_id,
                    match.id,
                    "Pickup reservation expired",
                    f"Your reservation for {donation.title} expired before collection. The food was released for other eligible organizations.",
                    "RESERVATION_EXPIRED",
                )
                if provider is not None:
                    _add_notification(
                        db,
                        donation.provider_id,
                        match.id,
                        "Donation reservation expired",
                        f"{recipient_name} did not collect {donation.title} by the deadline. The donation is "
                        f"{'available again' if donation.status == 'AVAILABLE' else 'expired'}." ,
                        "RESERVATION_EXPIRED",
                    )
                db.commit()
                if donation.status == "AVAILABLE":
                    released += 1

        if candidates:
            store.refresh_from_db()
            from app.services.matching.heuristic import generate_matches_for_donation

            for donation_id in {
                store.matches[item_id]["donation_id"]
                for item_id in candidates
                if item_id in store.matches
            }:
                donation = store.donations.get(donation_id)
                if donation and donation["status"] == "AVAILABLE":
                    generate_matches_for_donation(donation_id)
        return released
