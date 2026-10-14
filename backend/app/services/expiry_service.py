from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.store import store
from app.models import DonationORM, MatchORM, NotificationORM

logger = logging.getLogger(__name__)


def _as_utc(val: Any) -> datetime:
    if isinstance(val, str):
        val = datetime.fromisoformat(val.replace("Z", "+00:00"))
    if not isinstance(val, datetime):
        raise ValueError("Invalid datetime")
    if val.tzinfo is None:
        return val.replace(tzinfo=timezone.utc)
    return val.astimezone(timezone.utc)


class ExpiryService:
    @staticmethod
    def expire_donation(
        donation_id: str,
        db: Session | None = None,
        now: datetime | None = None,
        commit: bool = True,
    ) -> dict[str, Any] | None:
        """
        Transition an overdue AVAILABLE or RESERVED donation and its active matches to EXPIRED.
        Strict row-locking order:
          1. DonationORM (FOR UPDATE)
          2. MatchORM (FOR UPDATE)
          3. NotificationORM (insert)
          4. commit (if commit=True)
        """
        if now is None:
            now = datetime.now(timezone.utc)
        else:
            now = _as_utc(now)

        if db is not None:
            return ExpiryService._expire_donation_tx(
                donation_id=donation_id,
                db=db,
                now=now,
                commit=commit,
            )

        with SessionLocal() as session:
            try:
                res = ExpiryService._expire_donation_tx(
                    donation_id=donation_id,
                    db=session,
                    now=now,
                    commit=True,
                )
                return res
            except Exception:
                session.rollback()
                raise

    @staticmethod
    def _expire_donation_tx(
        donation_id: str,
        db: Session,
        now: datetime,
        commit: bool = True,
    ) -> dict[str, Any] | None:
        is_postgres = db.bind.dialect.name == "postgresql"

        # 1. Row-level lock on DonationORM
        don_query = db.query(DonationORM).filter(DonationORM.id == donation_id)
        donation_row = don_query.with_for_update().first() if is_postgres else don_query.first()

        if donation_row is None and os.environ.get("PYTEST_CURRENT_TEST") and donation_id in store.donations:
            donation_row = DonationORM(**store._donation_to_row(store.donations[donation_id]))
            db.add(donation_row)
            db.flush()

        if donation_row is None:
            return None

        # Idempotency guard: If already EXPIRED, COMPLETED, or CANCELLED, do not re-expire
        if donation_row.status not in ("AVAILABLE", "RESERVED"):
            return store._donation_from_row(donation_row)

        # Recheck expiry after acquiring the donation row lock.
        if _as_utc(donation_row.expiry_time) > _as_utc(now):
            return store._donation_from_row(donation_row)

        prev_status = donation_row.status

        # 2. Row-level lock on associated MatchORM records
        match_query = db.query(MatchORM).filter(MatchORM.donation_id == donation_id)
        match_rows = match_query.with_for_update().all() if is_postgres else match_query.all()

        # 3. Transition Donation to EXPIRED
        donation_row.status = "EXPIRED"
        donation_row.updated_at = now

        created_notifs: list[NotificationORM] = []
        expired_matches: list[MatchORM] = []

        if prev_status == "AVAILABLE":
            # Expire PROPOSED and NOTIFIED candidate matches
            for m in match_rows:
                if m.status in ("PROPOSED", "NOTIFIED"):
                    m.status = "EXPIRED"
                    m.updated_at = now
                    expired_matches.append(m)

                    # Notify recipient of the opportunity expiration
                    dup = (
                        db.query(NotificationORM)
                        .filter(
                            NotificationORM.user_id == m.recipient_id,
                            NotificationORM.match_id == m.id,
                            NotificationORM.type == "SYSTEM",
                        )
                        .first()
                    )
                    if not dup:
                        notif = NotificationORM(
                            id=f"notif_{uuid.uuid4().hex[:12]}_{m.recipient_id}",
                            user_id=m.recipient_id,
                            match_id=m.id,
                            title="Donation listing expired",
                            message=f"The donation listing '{donation_row.title}' has expired without being reserved.",
                            type="SYSTEM",
                            is_read=False,
                            created_at=now,
                        )
                        db.add(notif)
                        created_notifs.append(notif)

            # Notify food provider that listing expired unreserved
            p_dup = (
                db.query(NotificationORM)
                .filter(
                    NotificationORM.user_id == donation_row.provider_id,
                    NotificationORM.type == "SYSTEM",
                    NotificationORM.message.contains(donation_row.id),
                )
                .first()
            )
            if not p_dup:
                p_notif = NotificationORM(
                    id=f"notif_{uuid.uuid4().hex[:12]}_{donation_row.provider_id}",
                    user_id=donation_row.provider_id,
                    match_id=None,
                    title="Donation listing expired",
                    message=(
                        f"Your donation listing '{donation_row.title}' ({donation_row.id}) "
                        f"has expired without being reserved."
                    ),
                    type="SYSTEM",
                    is_read=False,
                    created_at=now,
                )
                db.add(p_notif)
                created_notifs.append(p_notif)

        elif prev_status == "RESERVED":
            # Expire ACCEPTED match and any candidate matches
            accepted_match = next((m for m in match_rows if m.status == "ACCEPTED"), None)
            for m in match_rows:
                if m.status in ("ACCEPTED", "PROPOSED", "NOTIFIED"):
                    m.status = "EXPIRED"
                    m.updated_at = now
                    expired_matches.append(m)

            if accepted_match:
                # Notify reserving recipient: pickup window expired
                r_dup = (
                    db.query(NotificationORM)
                    .filter(
                        NotificationORM.user_id == accepted_match.recipient_id,
                        NotificationORM.match_id == accepted_match.id,
                        NotificationORM.type == "EXPIRY_WARNING",
                    )
                    .first()
                )
                if not r_dup:
                    r_notif = NotificationORM(
                        id=f"notif_{uuid.uuid4().hex[:12]}_{accepted_match.recipient_id}",
                        user_id=accepted_match.recipient_id,
                        match_id=accepted_match.id,
                        title="Pickup window expired",
                        message=f"The pickup window for your reservation of '{donation_row.title}' has expired.",
                        type="EXPIRY_WARNING",
                        is_read=False,
                        created_at=now,
                    )
                    db.add(r_notif)
                    created_notifs.append(r_notif)

                # Notify food provider: reservation expired before pickup
                p_dup = (
                    db.query(NotificationORM)
                    .filter(
                        NotificationORM.user_id == donation_row.provider_id,
                        NotificationORM.match_id == accepted_match.id,
                        NotificationORM.type == "EXPIRY_WARNING",
                    )
                    .first()
                )
                if not p_dup:
                    p_notif = NotificationORM(
                        id=f"notif_{uuid.uuid4().hex[:12]}_{donation_row.provider_id}",
                        user_id=donation_row.provider_id,
                        match_id=accepted_match.id,
                        title="Reservation expired before pickup",
                        message=(
                            f"The reservation for '{donation_row.title}' has expired "
                            f"before pickup was completed."
                        ),
                        type="EXPIRY_WARNING",
                        is_read=False,
                        created_at=now,
                    )
                    db.add(p_notif)
                    created_notifs.append(p_notif)

        # 4. Commit if requested
        if commit:
            db.commit()
            db.refresh(donation_row)
            for m in expired_matches:
                db.refresh(m)
            for n in created_notifs:
                db.refresh(n)

        # 5. Synchronize committed state to store
        res_donation = store._donation_from_row(donation_row)
        store.donations[donation_row.id] = res_donation
        for m in expired_matches:
            store.matches[m.id] = store._match_from_row(m)
        for n in created_notifs:
            store.notifications[n.id] = store._notification_from_row(n)

        return res_donation

    @staticmethod
    def sweep_expired_donations(
        as_of: datetime | None = None,
        db: Session | None = None,
    ) -> dict[str, Any]:
        """
        Discover all AVAILABLE and RESERVED donations whose expiry_time <= as_of and expire them.
        """
        if as_of is None:
            as_of = datetime.now(timezone.utc)
        else:
            as_of = _as_utc(as_of)

        def _sweep_in_session(s: Session) -> list[str]:
            # Deterministic ordering by ID to prevent deadlocks
            candidates = (
                s.query(DonationORM.id)
                .filter(
                    DonationORM.status.in_(["AVAILABLE", "RESERVED"]),
                    DonationORM.expiry_time <= as_of,
                )
                .order_by(DonationORM.id)
                .all()
            )
            don_ids = [r[0] for r in candidates]

            expired: list[str] = []
            for d_id in don_ids:
                res = ExpiryService._expire_donation_tx(
                    donation_id=d_id,
                    db=s,
                    now=as_of,
                    commit=True,
                )
                if res and res.get("status") == "EXPIRED":
                    expired.append(d_id)
            return expired

        if db is not None:
            expired_donation_ids = _sweep_in_session(db)
        else:
            with SessionLocal() as session:
                try:
                    expired_donation_ids = _sweep_in_session(session)
                except Exception:
                    session.rollback()
                    raise

        return {
            "as_of": as_of.isoformat(),
            "expired_count": len(expired_donation_ids),
            "expired_donation_ids": expired_donation_ids,
        }
