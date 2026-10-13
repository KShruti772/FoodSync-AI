from __future__ import annotations

import concurrent.futures
import threading
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

from app.core.database import SessionLocal, engine
from app.core.store import store
from app.models import DonationORM, ImpactLogORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM
from app.services.reservation_service import ReservationService


@pytest.fixture(autouse=True)
def clean_postgres_tables():
    """Ensure tests run against a clean database state and verify PostgreSQL engine."""
    if engine.dialect.name != "postgresql":
        pytest.skip("Reservation concurrency integration tests require active PostgreSQL engine")

    with SessionLocal() as db:
        db.query(ImpactLogORM).delete()
        db.query(NotificationORM).delete()
        db.query(MatchORM).delete()
        db.query(DonationORM).delete()
        db.query(RecipientProfileORM).delete()
        db.query(UserORM).delete()
        db.commit()

    store.users.clear()
    store.donor_profiles.clear()
    store.recipient_profiles.clear()
    store.donations.clear()
    store.matches.clear()
    store.notifications.clear()
    store.impact_logs.clear()
    yield
    with SessionLocal() as db:
        db.query(ImpactLogORM).delete()
        db.query(NotificationORM).delete()
        db.query(MatchORM).delete()
        db.query(DonationORM).delete()
        db.query(RecipientProfileORM).delete()
        db.query(UserORM).delete()
        db.commit()


def _seed_donation_and_matches(
    num_recipients: int = 2,
) -> tuple[str, str, list[tuple[str, str]]]:
    """Helper to seed a provider, a donation, and competing matches in PostgreSQL."""
    now = datetime.now(timezone.utc)
    provider_id = "user_provider_test"
    donation_id = "don_concurrency_01"

    with SessionLocal() as db:
        # Seed Provider
        provider = UserORM(
            id=provider_id,
            email="provider_conc@example.com",
            password_hash="hashed_pw",
            role="FOOD_PROVIDER",
            organization_name="Provider Org",
            is_verified=True,
            created_at=now,
            updated_at=now,
        )
        db.add(provider)

        # Seed Donation
        donation = DonationORM(
            id=donation_id,
            provider_id=provider_id,
            title="Fresh Hot Meals (50 boxes)",
            food_type="VEGETARIAN_COOKED",
            perishable=True,
            quantity_meals=50,
            prepared_at=now - timedelta(hours=1),
            expiry_time=now + timedelta(hours=4),
            pickup_address="123 Market Square, Solapur",
            latitude=17.6599,
            longitude=75.9064,
            status="AVAILABLE",
            created_at=now,
            updated_at=now,
        )
        db.add(donation)

        recipients_and_matches: list[tuple[str, str]] = []
        for i in range(1, num_recipients + 1):
            r_id = f"user_recip_{i:02d}"
            r_user = UserORM(
                id=r_id,
                email=f"recip_{i:02d}@example.com",
                password_hash="hashed_pw",
                role="RECIPIENT",
                organization_name=f"Shelter {i}",
                is_verified=True,
                created_at=now,
                updated_at=now,
            )
            db.add(r_user)

            m_id = f"match_conc_{i:02d}"
            match = MatchORM(
                id=m_id,
                donation_id=donation_id,
                recipient_id=r_id,
                compatibility_score=0.95 - (i * 0.05),
                distance_km=2.0 * i,
                matched_factors="{}",
                status="PROPOSED",
                created_at=now,
                updated_at=now,
            )
            db.add(match)
            recipients_and_matches.append((r_id, m_id))

        db.commit()

    return provider_id, donation_id, recipients_and_matches


def test_01_valid_recipient_accepts_eligible_match():
    """1. A valid recipient accepts an eligible match and persists correctly in PostgreSQL."""
    _, donation_id, recipients = _seed_donation_and_matches(num_recipients=2)
    recip_id, match_id = recipients[0]

    result = ReservationService.accept_match(match_id, recip_id)
    assert result["id"] == match_id
    assert result["status"] == "ACCEPTED"

    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row is not None
        assert don_row.status == "RESERVED"

        m_row = db.get(MatchORM, match_id)
        assert m_row is not None
        assert m_row.status == "ACCEPTED"

        # Competing match must be EXPIRED
        comp_id = recipients[1][1]
        comp_row = db.get(MatchORM, comp_id)
        assert comp_row is not None
        assert comp_row.status == "EXPIRED"

        # Notification must be created
        notifs = db.query(NotificationORM).filter_by(match_id=match_id).all()
        assert len(notifs) == 1
        assert notifs[0].type == "RESERVATION_CONFIRMATION"
        assert notifs[0].user_id == recip_id


def test_02_unauthorized_recipient_cannot_accept_another_match():
    """2. An unauthorized recipient cannot accept another recipient's match."""
    _, donation_id, recipients = _seed_donation_and_matches(num_recipients=2)
    recip_a, match_a = recipients[0]
    recip_b, _ = recipients[1]

    # Recipient B attempts to accept Recipient A's match
    with pytest.raises(ValueError, match="You are not assigned to this match"):
        ReservationService.accept_match(match_a, recip_b)

    # Verify no state was altered in PostgreSQL
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "AVAILABLE"
        m_row = db.get(MatchORM, match_a)
        assert m_row.status == "PROPOSED"


def test_03_concurrent_reservation_overlapping_transactions():
    """3 & 4. Two independent database sessions attempt to accept different matches for the same donation.

    Genuinely overlapping transactions executed in parallel threads with a synchronization barrier.
    Row-level locking (SELECT ... FOR UPDATE) ensures exactly one succeeds and the loser gets a conflict.
    """
    _, donation_id, recipients = _seed_donation_and_matches(num_recipients=2)
    (recip_1, match_1), (recip_2, match_2) = recipients

    barrier = threading.Barrier(2)
    results: list[dict | Exception] = []

    def worker(m_id: str, r_id: str):
        # Synchronize thread execution so both attempt acquisition simultaneously
        barrier.wait()
        try:
            res = ReservationService.accept_match(m_id, r_id)
            return ("SUCCESS", res)
        except Exception as exc:
            return ("ERROR", exc)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(worker, match_1, recip_1)
        f2 = executor.submit(worker, match_2, recip_2)
        results = [f1.result(), f2.result()]

    successes = [r for r in results if r[0] == "SUCCESS"]
    errors = [r for r in results if r[0] == "ERROR"]

    # Exactly one acceptance must succeed
    assert len(successes) == 1, f"Expected 1 success, got: {results}"
    assert len(errors) == 1, f"Expected 1 error, got: {results}"

    winning_result = successes[0][1]
    losing_exception = errors[0][1]

    assert winning_result["status"] == "ACCEPTED"
    assert "no longer available" in str(losing_exception).lower()

    # 5. Consistency verification in PostgreSQL
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "RESERVED"

        m1 = db.get(MatchORM, match_1)
        m2 = db.get(MatchORM, match_2)

        statuses = {m1.status, m2.status}
        assert statuses == {"ACCEPTED", "EXPIRED"}

        # Exactly one reservation notification in database
        notifs = db.query(NotificationORM).filter_by(type="RESERVATION_CONFIRMATION").all()
        assert len(notifs) == 1


def test_04_failure_during_transaction_leaves_no_partial_changes():
    """6. A failure during the transaction rolls back cleanly, leaving no partial database changes."""
    _, donation_id, recipients = _seed_donation_and_matches(num_recipients=2)
    recip_id, match_id = recipients[0]

    # Simulate an unforeseen exception right before commit
    with patch.object(NotificationORM, "__init__", side_effect=RuntimeError("Simulated database failure")):
        with pytest.raises(RuntimeError, match="Simulated database failure"):
            ReservationService.accept_match(match_id, recip_id)

    # Verify atomic rollback in PostgreSQL
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "AVAILABLE"

        m_row = db.get(MatchORM, match_id)
        assert m_row.status == "PROPOSED"

        comp_row = db.get(MatchORM, recipients[1][1])
        assert comp_row.status == "PROPOSED"

        notif_count = db.query(NotificationORM).count()
        assert notif_count == 0


def test_05_fresh_database_session_reads_committed_state():
    """7. A fresh, independent database session reads the committed state correctly."""
    _, donation_id, recipients = _seed_donation_and_matches(num_recipients=2)
    recip_id, match_id = recipients[0]

    ReservationService.accept_match(match_id, recip_id)

    # Wipe in-memory dictionaries completely
    store.donations.clear()
    store.matches.clear()
    store.notifications.clear()

    # Create a fresh database session
    with SessionLocal() as fresh_db:
        don = fresh_db.get(DonationORM, donation_id)
        assert don is not None
        assert don.status == "RESERVED"

        accepted_match = fresh_db.get(MatchORM, match_id)
        assert accepted_match is not None
        assert accepted_match.status == "ACCEPTED"

        expired_match = fresh_db.get(MatchORM, recipients[1][1])
        assert expired_match is not None
        assert expired_match.status == "EXPIRED"


def test_06_stale_in_memory_sync_cannot_overwrite_reserved_donation():
    """Verify that a later whole-store sync does not overwrite PostgreSQL-authoritative RESERVED status."""
    _, donation_id, recipients = _seed_donation_and_matches(num_recipients=2)
    recip_id, match_id = recipients[0]

    # Reserve the donation
    ReservationService.accept_match(match_id, recip_id)

    # Intentionally corrupt in-memory store with stale AVAILABLE status
    store.donations[donation_id]["status"] = "AVAILABLE"

    # Run store-wide synchronization
    store.sync_donations()
    store.sync_all()

    # Verify PostgreSQL retained RESERVED status
    with SessionLocal() as db:
        don = db.get(DonationORM, donation_id)
        assert don.status == "RESERVED"

    # Verify store memory was healed/refreshed
    assert store.donations[donation_id]["status"] == "RESERVED"
