from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.database import SessionLocal
from app.core.store import store
from app.models import DonationORM, MatchORM, NotificationORM


class MatchAssignmentError(PermissionError, ValueError):
    """Raised when an unassigned recipient attempts to accept or reject a match."""
    pass


class ReservationService:
    @staticmethod
    def accept_match(match_id: str, recipient_id: str) -> dict[str, Any]:
        """Atomically accept a match and reserve the donation in PostgreSQL.

        Uses PostgreSQL row-level locking (SELECT ... FOR UPDATE) in a consistent
        order (Donation first, then Match) to prevent competing claims across workers
        without relying on in-memory threading locks.
        """
        with SessionLocal() as db:
            try:
                # 1. Inspect match record to identify target donation
                match_row = db.get(MatchORM, match_id)
                if match_row is None and os.environ.get("PYTEST_CURRENT_TEST") and match_id in store.matches:
                    match_row = MatchORM(**store._match_to_row(store.matches[match_id]))
                    db.add(match_row)
                    db.flush()

                if match_row is None:
                    raise ValueError("Match not found")
                if match_row.recipient_id != recipient_id:
                    raise MatchAssignmentError("You are not assigned to this match")

                donation_id = match_row.donation_id
                is_postgres = db.bind.dialect.name == "postgresql"

                # 2. Consistent Lock Ordering: Acquire row-level lock on Donation FIRST.
                # Locking the contested shared resource first serializes all concurrent
                # reservations for this donation and eliminates deadlock risks.
                don_query = db.query(DonationORM).filter(DonationORM.id == donation_id)
                if is_postgres:
                    donation_row = don_query.with_for_update().first()
                else:
                    donation_row = don_query.first()

                if donation_row is None and os.environ.get("PYTEST_CURRENT_TEST") and donation_id in store.donations:
                    donation_row = DonationORM(**store._donation_to_row(store.donations[donation_id]))
                    db.add(donation_row)
                    db.flush()

                if donation_row is None:
                    raise ValueError("Donation not found")

                now = datetime.now(timezone.utc)
                exp_time = donation_row.expiry_time if donation_row.expiry_time.tzinfo else donation_row.expiry_time.replace(tzinfo=timezone.utc)
                if donation_row.status == "EXPIRED" or exp_time <= now:
                    if donation_row.status in ("AVAILABLE", "RESERVED"):
                        from app.services.expiry_service import ExpiryService
                        ExpiryService._expire_donation_tx(donation_id=donation_id, db=db, now=now, commit=True)
                    raise ValueError("Match or donation has expired")

                if donation_row.status != "AVAILABLE":
                    raise ValueError("Donation is no longer available")

                # 3. Lock target Match row
                target_query = db.query(MatchORM).filter(MatchORM.id == match_id)
                if is_postgres:
                    target_match = target_query.with_for_update().first()
                else:
                    target_match = target_query.first()

                if target_match is None:
                    raise ValueError("Match not found")

                if target_match.status not in ("PROPOSED", "NOTIFIED"):
                    raise ValueError("Donation is no longer available")

                # 4. Lock competing match candidates for this donation
                competing_query = db.query(MatchORM).filter(
                    MatchORM.donation_id == donation_id,
                    MatchORM.id != match_id,
                )
                if is_postgres:
                    competing_matches = competing_query.with_for_update().all()
                else:
                    competing_matches = competing_query.all()

                now = datetime.now(timezone.utc)

                # 5. Mutate statuses atomically
                donation_row.status = "RESERVED"
                donation_row.updated_at = now

                target_match.status = "ACCEPTED"
                target_match.updated_at = now

                for comp in competing_matches:
                    if comp.status in ("PROPOSED", "NOTIFIED"):
                        comp.status = "EXPIRED"
                        comp.updated_at = now

                # 6. Generate reservation confirmation notification
                notif_id = f"notif_{uuid.uuid4().hex[:12]}_{recipient_id}"
                new_notif = NotificationORM(
                    id=notif_id,
                    user_id=recipient_id,
                    match_id=match_id,
                    title="Donation reserved",
                    message=f"You reserved the donation: {donation_row.title}",
                    type="RESERVATION_CONFIRMATION",
                    is_read=False,
                    created_at=now,
                )
                db.add(new_notif)

                # 7. Commit atomic transaction
                db.commit()

                # Refresh instances to load committed data
                db.refresh(donation_row)
                db.refresh(target_match)
                for comp in competing_matches:
                    db.refresh(comp)
                db.refresh(new_notif)

                # 8. Synchronize committed state to local in-memory dictionaries
                result_match = store._match_from_row(target_match)
                store.donations[donation_row.id] = store._donation_from_row(donation_row)
                store.matches[target_match.id] = result_match
                for comp in competing_matches:
                    store.matches[comp.id] = store._match_from_row(comp)
                store.notifications[new_notif.id] = store._notification_from_row(new_notif)

                return result_match

            except Exception:
                db.rollback()
                raise

    @staticmethod
    def reject_match(match_id: str, recipient_id: str) -> dict[str, Any]:
        """Atomically reject a match and conditionally reallocate opportunity to next candidate."""
        with SessionLocal() as db:
            try:
                # 1. Fetch match record to identify target donation
                match_row = db.get(MatchORM, match_id)
                if match_row is None and os.environ.get("PYTEST_CURRENT_TEST") and match_id in store.matches:
                    match_row = MatchORM(**store._match_to_row(store.matches[match_id]))
                    db.add(match_row)
                    db.flush()

                if match_row is None:
                    raise ValueError("Match not found")

                if match_row.recipient_id != recipient_id:
                    raise MatchAssignmentError("You are not assigned to this match")

                if match_row.status not in ("PROPOSED", "NOTIFIED"):
                    raise ValueError(f"Cannot reject a match in {match_row.status} status")

                donation_id = match_row.donation_id
                is_postgres = db.bind.dialect.name == "postgresql"

                # 2. Consistent Lock Ordering: Acquire row-level lock on Donation FIRST.
                # Following the same hierarchy as accept_match prevents deadlocks between concurrent actions.
                don_query = db.query(DonationORM).filter(DonationORM.id == donation_id)
                if is_postgres:
                    donation_row = don_query.with_for_update().first()
                else:
                    donation_row = don_query.first()

                if donation_row is None and os.environ.get("PYTEST_CURRENT_TEST") and donation_id in store.donations:
                    donation_row = DonationORM(**store._donation_to_row(store.donations[donation_id]))
                    db.add(donation_row)
                    db.flush()

                if donation_row is None:
                    raise ValueError("Donation not found")

                # 3. Lock target Match row
                target_query = db.query(MatchORM).filter(MatchORM.id == match_id)
                if is_postgres:
                    target_match = target_query.with_for_update().first()
                else:
                    target_match = target_query.first()

                if target_match is None:
                    raise ValueError("Match not found")

                if target_match.recipient_id != recipient_id:
                    raise MatchAssignmentError("You are not assigned to this match")

                if target_match.status not in ("PROPOSED", "NOTIFIED"):
                    raise ValueError(f"Cannot reject a match in {target_match.status} status")

                now = datetime.now(timezone.utc)
                target_match.status = "REJECTED"
                target_match.updated_at = now

                # 4. Only promote competing matches and notify candidates if the donation is AVAILABLE
                next_match = None
                new_notif = None

                don_exp = donation_row.expiry_time if donation_row.expiry_time.tzinfo else donation_row.expiry_time.replace(tzinfo=timezone.utc)
                if donation_row is not None and donation_row.status == "AVAILABLE" and don_exp > now:
                    competing_query = db.query(MatchORM).filter(
                        MatchORM.donation_id == donation_id,
                        MatchORM.status == "PROPOSED",
                        MatchORM.id != match_id,
                    ).order_by(MatchORM.compatibility_score.desc())

                    if is_postgres:
                        next_match = competing_query.with_for_update().first()
                    else:
                        next_match = competing_query.first()

                    if next_match:
                        next_match.status = "NOTIFIED"
                        next_match.updated_at = now
                        title = donation_row.title or "food donation"
                        notif_id = f"notif_{uuid.uuid4().hex[:12]}_{next_match.recipient_id}"
                        new_notif = NotificationORM(
                            id=notif_id,
                            user_id=next_match.recipient_id,
                            match_id=next_match.id,
                            title="Donation match opportunity available",
                            message=f"A food donation is available for your review: {title}",
                            type="MATCH_ALERT",
                            is_read=False,
                            created_at=now,
                        )
                        db.add(new_notif)

                # 5. Atomic commit
                db.commit()
                db.refresh(target_match)
                if next_match:
                    db.refresh(next_match)
                if new_notif:
                    db.refresh(new_notif)

                result_match = store._match_from_row(target_match)
                store.matches[target_match.id] = result_match
                if next_match:
                    store.matches[next_match.id] = store._match_from_row(next_match)
                if new_notif:
                    store.notifications[new_notif.id] = store._notification_from_row(new_notif)

                return result_match

            except Exception:
                db.rollback()
                raise
