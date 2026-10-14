from __future__ import annotations

import concurrent.futures
import threading
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import text

from app.core.database import SessionLocal, engine
from app.core.store import store
from app.main import app
from app.models import (
    DonationORM,
    ImpactLogORM,
    MatchORM,
    NotificationORM,
    RecipientProfileORM,
    UserORM,
)
from app.services.expiry_service import ExpiryService
from app.services.reservation_service import ReservationService

client = TestClient(app)


@pytest.fixture(autouse=True)
def verify_postgres_engine():
    """Ensure tests run against a genuine PostgreSQL instance."""
    if engine.dialect.name != "postgresql":
        pytest.skip("Expiry lifecycle integration tests require active PostgreSQL engine")


@pytest.fixture(autouse=True)
def cleanup_database():
    """Clean up test records while strictly observing foreign-key deletion constraints."""
    yield
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


def _unique_email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@foodsync.org"


def _register_provider(email: str, password: str = "SecurePassword123!") -> tuple[str, str]:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "role": "FOOD_PROVIDER",
            "organization_name": "Expiry Test Bakery",
            "phone": "9876543210",
            "address": "12 Station Road, Solapur",
            "latitude": 17.6599,
            "longitude": 75.9064,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    return data["user"]["id"], data["token"]


def _register_recipient(
    email: str,
    password: str = "ShelterPassword456!",
    lat: float = 17.6650,
    lng: float = 75.9120,
    daily_capacity: int = 150,
) -> tuple[str, str]:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "role": "RECIPIENT",
            "organization_name": "Expiry Test Shelter",
            "phone": "9123456789",
            "address": "15 Gandhi Nagar, Solapur",
            "latitude": lat,
            "longitude": lng,
            "password": password,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    recip_id = data["user"]["id"]
    token = data["token"]

    prof_res = client.put(
        "/api/v1/recipients/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "org_type": "COMMUNITY_KITCHEN",
            "daily_capacity_meals": daily_capacity,
            "storage_types": ["DRY", "REFRIGERATED"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 25.0,
        },
    )
    assert prof_res.status_code == 200, prof_res.text
    return recip_id, token


def _create_donation(
    token: str,
    title: str = "Fresh Vegetable Biryani",
    quantity: int = 50,
    prepared_at: datetime | None = None,
    expiry_time: datetime | None = None,
) -> dict:
    now = datetime.now(timezone.utc)
    p_at = prepared_at or (now - timedelta(hours=1))
    e_time = expiry_time or (now + timedelta(hours=4))
    res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": title,
            "food_type": "VEGETARIAN_COOKED",
            "perishable": True,
            "quantity_meals": quantity,
            "prepared_at": p_at.isoformat(),
            "expiry_time": e_time.isoformat(),
            "pickup_address": "12 Station Road, Solapur Central",
            "latitude": 17.6599,
            "longitude": 75.9064,
            "special_instructions": "Keep covered until distribution.",
        },
    )
    return res


# ---------------------------------------------------------------------------
# Test 1: Past/present expiry validation and the prepared_at boundary
# ---------------------------------------------------------------------------
def test_01_expiry_time_creation_validation_boundaries():
    """Verify that expiry_time <= now and expiry_time <= prepared_at are rejected at creation."""
    _, provider_token = _register_provider(_unique_email("prov_val"))
    now = datetime.now(timezone.utc)

    # 1. Reject expiry_time in the past (expiry_time <= now)
    past_res = _create_donation(
        provider_token,
        prepared_at=now - timedelta(hours=2),
        expiry_time=now - timedelta(minutes=10),
    )
    assert past_res.status_code == 400, past_res.text
    err_past = past_res.json()["detail"]["error"]
    assert err_past["code"] == "VALIDATION_ERROR"
    assert "future" in err_past["message"].lower()

    # 2. Reject expiry_time equal to now
    now_res = _create_donation(
        provider_token,
        prepared_at=now - timedelta(hours=1),
        expiry_time=now,
    )
    assert now_res.status_code == 400, now_res.text
    err_now = now_res.json()["detail"]["error"]
    assert err_now["code"] == "VALIDATION_ERROR"

    # 3. Reject expiry_time before prepared_at (even if prepared_at is in the future)
    future_time = now + timedelta(hours=5)
    inverted_res = _create_donation(
        provider_token,
        prepared_at=future_time,
        expiry_time=future_time - timedelta(hours=1),
    )
    assert inverted_res.status_code == 400, inverted_res.text
    err_inverted = inverted_res.json()["detail"]["error"]
    assert err_inverted["code"] == "VALIDATION_ERROR"
    assert "preparation" in err_inverted["message"].lower()

    # 4. Reject expiry_time equal to prepared_at
    equal_res = _create_donation(
        provider_token,
        prepared_at=now + timedelta(hours=1),
        expiry_time=now + timedelta(hours=1),
    )
    assert equal_res.status_code == 400, equal_res.text
    err_equal = equal_res.json()["detail"]["error"]
    assert err_equal["code"] == "VALIDATION_ERROR"

    # 5. Success: expiry_time > prepared_at and expiry_time > now (no 30-min creation minimum)
    valid_res = _create_donation(
        provider_token,
        prepared_at=now - timedelta(minutes=10),
        expiry_time=now + timedelta(minutes=15),
    )
    assert valid_res.status_code == 201, valid_res.text
    assert valid_res.json()["status"] == "AVAILABLE"


# ---------------------------------------------------------------------------
# Test 2: Expiry of an available donation and its candidate matches
# ---------------------------------------------------------------------------
def test_02_expiry_of_available_donation_and_candidate_matches():
    """Verify that expiring an AVAILABLE donation transitions it and active matches to EXPIRED."""
    prov_id, prov_token = _register_provider(_unique_email("prov_avail"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_avail"))

    now = datetime.now(timezone.utc)
    res = _create_donation(prov_token, expiry_time=now + timedelta(hours=3))
    assert res.status_code == 201
    donation_id = res.json()["id"]

    # Confirm candidate match was created and recipient notified
    with SessionLocal() as db:
        matches = db.query(MatchORM).filter(MatchORM.donation_id == donation_id).all()
        assert len(matches) >= 1
        notified_match = next((m for m in matches if m.status in ("PROPOSED", "NOTIFIED")), None)
        assert notified_match is not None

        # Simulate expiration by setting expiry_time into the past
        db.query(DonationORM).filter(DonationORM.id == donation_id).update(
            {"expiry_time": now - timedelta(minutes=10)}
        )
        db.commit()

    # Execute expiry transition via service
    result = ExpiryService.expire_donation(donation_id)
    assert result is not None
    assert result["status"] == "EXPIRED"

    # Verify PostgreSQL state
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "EXPIRED"

        match_rows = db.query(MatchORM).filter(MatchORM.donation_id == donation_id).all()
        assert all(m.status == "EXPIRED" for m in match_rows)

        # Provider received listing expired notification
        prov_notif = (
            db.query(NotificationORM)
            .filter(
                NotificationORM.user_id == prov_id,
                NotificationORM.type == "SYSTEM",
                NotificationORM.title == "Donation listing expired",
            )
            .first()
        )
        assert prov_notif is not None

        # Recipient received listing expired notification if they were notified
        recip_notifs = (
            db.query(NotificationORM)
            .filter(
                NotificationORM.user_id == recip_id,
                NotificationORM.type == "SYSTEM",
            )
            .all()
        )
        assert len(recip_notifs) >= 1


# ---------------------------------------------------------------------------
# Test 3: Expiry of a reserved donation and its accepted match
# ---------------------------------------------------------------------------
def test_03_expiry_of_reserved_donation_and_accepted_match():
    """Verify that expiring a RESERVED donation transitions it and ACCEPTED match to EXPIRED."""
    prov_id, prov_token = _register_provider(_unique_email("prov_res"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_res"))

    now = datetime.now(timezone.utc)
    res = _create_donation(prov_token, expiry_time=now + timedelta(hours=3))
    assert res.status_code == 201
    donation_id = res.json()["id"]

    # Recipient accepts match
    matches_res = client.get("/api/v1/recipients/matches", headers={"Authorization": f"Bearer {recip_token}"})
    assert matches_res.status_code == 200
    match_list = matches_res.json()["data"]
    assert len(match_list) >= 1
    match_id = match_list[0]["id"]

    accept_res = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})
    assert accept_res.status_code == 200
    assert accept_res.json()["data"]["status"] == "ACCEPTED"

    # Set expiry_time to the past in PostgreSQL
    with SessionLocal() as db:
        db.query(DonationORM).filter(DonationORM.id == donation_id).update(
            {"expiry_time": now - timedelta(minutes=5)}
        )
        db.commit()

    # Expire reserved donation
    result = ExpiryService.expire_donation(donation_id)
    assert result["status"] == "EXPIRED"

    # Verify PostgreSQL state
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "EXPIRED"

        match_row = db.get(MatchORM, match_id)
        assert match_row.status == "EXPIRED"

        # Recipient received EXPIRY_WARNING
        r_notif = (
            db.query(NotificationORM)
            .filter(
                NotificationORM.user_id == recip_id,
                NotificationORM.match_id == match_id,
                NotificationORM.type == "EXPIRY_WARNING",
            )
            .first()
        )
        assert r_notif is not None
        assert "pickup window" in r_notif.title.lower()

        # Provider received EXPIRY_WARNING
        p_notif = (
            db.query(NotificationORM)
            .filter(
                NotificationORM.user_id == prov_id,
                NotificationORM.match_id == match_id,
                NotificationORM.type == "EXPIRY_WARNING",
            )
            .first()
        )
        assert p_notif is not None


# ---------------------------------------------------------------------------
# Test 4: Acceptance of an overdue donation being rejected
# ---------------------------------------------------------------------------
def test_04_acceptance_of_overdue_donation_rejected():
    """Verify that attempting to accept an overdue donation returns HTTP 400 and transitions state."""
    _, prov_token = _register_provider(_unique_email("prov_overdue_acc"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_overdue_acc"))

    now = datetime.now(timezone.utc)
    res = _create_donation(prov_token, expiry_time=now + timedelta(hours=2))
    assert res.status_code == 201
    donation_id = res.json()["id"]

    matches_res = client.get("/api/v1/recipients/matches", headers={"Authorization": f"Bearer {recip_token}"})
    assert matches_res.status_code == 200
    match_list = matches_res.json()["data"]
    assert len(match_list) >= 1
    match_id = match_list[0]["id"]

    # Simulate expiry before recipient calls accept
    with SessionLocal() as db:
        db.query(DonationORM).filter(DonationORM.id == donation_id).update(
            {"expiry_time": now - timedelta(minutes=5)}
        )
        db.commit()

    # Recipient attempts to accept match
    accept_res = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})
    assert accept_res.status_code == 400, accept_res.text
    err = accept_res.json()["detail"]["error"]
    assert err["code"] == "INVALID_STATE"
    assert "expired" in err["message"].lower()

    # Verify PostgreSQL is updated to EXPIRED on access
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "EXPIRED"
        match_row = db.get(MatchORM, match_id)
        assert match_row.status == "EXPIRED"


# ---------------------------------------------------------------------------
# Test 5: Completion of an overdue reservation being rejected without impact log
# ---------------------------------------------------------------------------
def test_05_completion_of_overdue_reservation_rejected_without_impact_log():
    """Verify that completing an overdue reservation returns HTTP 400 and generates zero impact logs."""
    _, prov_token = _register_provider(_unique_email("prov_overdue_comp"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_overdue_comp"))

    now = datetime.now(timezone.utc)
    res = _create_donation(prov_token, expiry_time=now + timedelta(hours=2))
    assert res.status_code == 201
    donation_id = res.json()["id"]

    # Match and accept
    matches_res = client.get("/api/v1/recipients/matches", headers={"Authorization": f"Bearer {recip_token}"})
    match_list = matches_res.json()["data"]
    assert len(match_list) >= 1
    match_id = match_list[0]["id"]
    accept_res = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})
    assert accept_res.status_code == 200

    # Advance time / set expiry_time in the past
    with SessionLocal() as db:
        db.query(DonationORM).filter(DonationORM.id == donation_id).update(
            {"expiry_time": now - timedelta(minutes=5)}
        )
        db.commit()

    # Attempt to complete the donation
    comp_res = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {prov_token}"},
        json={"notes": "Late pickup attempt"},
    )
    assert comp_res.status_code == 400, comp_res.text
    err = comp_res.json()["detail"]["error"]
    assert err["code"] == "INVALID_STATE"
    assert "expired" in err["message"].lower()

    # Verify PostgreSQL: Donation and match are EXPIRED, and 0 impact logs created
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "EXPIRED"
        match_row = db.get(MatchORM, match_id)
        assert match_row.status == "EXPIRED"

        impact_count = db.query(ImpactLogORM).filter(ImpactLogORM.donation_id == donation_id).count()
        assert impact_count == 0, "No impact logs must be generated for expired donations"


# ---------------------------------------------------------------------------
# Test 6: Recipient browsing excluding overdue listings without database mutations
# ---------------------------------------------------------------------------
def test_06_recipient_browsing_excluding_overdue_listings_without_db_mutations():
    """Verify GET /donations excludes overdue listings for recipients without modifying database state."""
    _, prov_token = _register_provider(_unique_email("prov_browse"))
    _, recip_token = _register_recipient(_unique_email("recip_browse"))

    now = datetime.now(timezone.utc)
    # Active future donation
    res_active = _create_donation(prov_token, title="Active Hot Meals", expiry_time=now + timedelta(hours=4))
    assert res_active.status_code == 201
    active_id = res_active.json()["id"]

    # Expired donation
    res_expired = _create_donation(prov_token, title="Overdue Rice Meals", expiry_time=now + timedelta(hours=2))
    assert res_expired.status_code == 201
    expired_id = res_expired.json()["id"]

    # Mutate expiry_time to past in DB without changing AVAILABLE status
    with SessionLocal() as db:
        db.query(DonationORM).filter(DonationORM.id == expired_id).update(
            {"expiry_time": now - timedelta(minutes=15)}
        )
        db.commit()

    # Recipient browses donations
    list_res = client.get("/api/v1/donations", headers={"Authorization": f"Bearer {recip_token}"})
    assert list_res.status_code == 200
    listed_items = list_res.json()
    listed_ids = [d["id"] for d in listed_items]

    # Must contain active, but MUST NOT contain overdue listing
    assert active_id in listed_ids
    assert expired_id not in listed_ids

    # Verify zero database mutations during GET request
    with SessionLocal() as db:
        row_exp = db.get(DonationORM, expired_id)
        assert row_exp.status == "AVAILABLE", "Browsing GET query must not mutate donation status in database"


# ---------------------------------------------------------------------------
# Test 7: Notification creation and duplicate prevention
# ---------------------------------------------------------------------------
def test_07_notification_creation_and_duplicate_prevention():
    """Verify that repeated expiry transitions do not generate duplicate notifications."""
    prov_id, prov_token = _register_provider(_unique_email("prov_notif_dup"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_notif_dup"))

    now = datetime.now(timezone.utc)
    res = _create_donation(prov_token, expiry_time=now + timedelta(hours=2))
    donation_id = res.json()["id"]

    # Set expiry to past
    with SessionLocal() as db:
        db.query(DonationORM).filter(DonationORM.id == donation_id).update(
            {"expiry_time": now - timedelta(minutes=10)}
        )
        db.commit()

    # Sweep 1
    sweep1 = ExpiryService.sweep_expired_donations()
    assert sweep1["expired_count"] == 1

    with SessionLocal() as db:
        initial_notifs_count = db.query(NotificationORM).filter(
            NotificationORM.user_id.in_([prov_id, recip_id])
        ).count()
        assert initial_notifs_count >= 1

    # Sweep 2 (repeated sweep)
    sweep2 = ExpiryService.sweep_expired_donations()
    assert sweep2["expired_count"] == 0

    # Direct re-invocation of expire_donation on the same ID
    ExpiryService.expire_donation(donation_id)

    # Verify notification count has not increased
    with SessionLocal() as db:
        final_notifs_count = db.query(NotificationORM).filter(
            NotificationORM.user_id.in_([prov_id, recip_id])
        ).count()
        assert final_notifs_count == initial_notifs_count, "No duplicate notifications should be created"


# ---------------------------------------------------------------------------
# Test 8: Concurrent acceptance and expiry processing
# ---------------------------------------------------------------------------
def test_08_concurrent_acceptance_and_expiry_processing():
    """Verify that concurrent accept_match and sweep serialize cleanly without deadlocks or corruption."""
    _, prov_token = _register_provider(_unique_email("prov_conc"))
    _, recip_token = _register_recipient(_unique_email("recip_conc"))

    now = datetime.now(timezone.utc)
    res = _create_donation(prov_token, expiry_time=now + timedelta(hours=2))
    assert res.status_code == 201
    donation_id = res.json()["id"]

    matches_res = client.get("/api/v1/recipients/matches", headers={"Authorization": f"Bearer {recip_token}"})
    match_list = matches_res.json()["data"]
    assert len(match_list) >= 1
    match_id = match_list[0]["id"]

    # Barrier to coordinate simultaneous execution
    barrier = threading.Barrier(2)
    results = {}

    def run_accept():
        barrier.wait()
        try:
            r = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})
            results["accept"] = r.status_code
        except Exception as e:
            results["accept"] = str(e)

    def run_sweep():
        barrier.wait()
        try:
            sweep_res = ExpiryService.sweep_expired_donations(as_of=datetime.now(timezone.utc) + timedelta(hours=3))
            results["sweep"] = sweep_res["expired_count"]
        except Exception as e:
            results["sweep"] = str(e)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(run_accept)
        f2 = executor.submit(run_sweep)
        concurrent.futures.wait([f1, f2], timeout=10)

    # Both threads finished cleanly
    assert "accept" in results
    assert "sweep" in results

    # Verify final PostgreSQL consistency
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        match_row = db.get(MatchORM, match_id)
        assert don_row.status in ("RESERVED", "EXPIRED")
        assert match_row.status in ("ACCEPTED", "EXPIRED")


# ---------------------------------------------------------------------------
# Test 9: Repeated sweeps being idempotent
# ---------------------------------------------------------------------------
def test_09_repeated_sweeps_idempotent():
    """Verify that running sweeps repeatedly is strictly idempotent."""
    _, prov_token = _register_provider(_unique_email("prov_sweep_idem"))
    now = datetime.now(timezone.utc)

    # Create 3 donations with past expiry
    d_ids = []
    for i in range(3):
        r = _create_donation(prov_token, title=f"Idempotent Food Batch {i}", expiry_time=now + timedelta(hours=1))
        assert r.status_code == 201
        d_ids.append(r.json()["id"])

    with SessionLocal() as db:
        db.query(DonationORM).filter(DonationORM.id.in_(d_ids)).update(
            {"expiry_time": now - timedelta(minutes=20)}
        )
        db.commit()

    # First sweep: should expire exactly 3 donations
    sweep1 = ExpiryService.sweep_expired_donations(as_of=now)
    assert sweep1["expired_count"] == 3
    assert set(sweep1["expired_donation_ids"]) == set(d_ids)

    # Second sweep: should expire 0 donations
    sweep2 = ExpiryService.sweep_expired_donations(as_of=now)
    assert sweep2["expired_count"] == 0
    assert sweep2["expired_donation_ids"] == []

    # Third sweep: still 0
    sweep3 = ExpiryService.sweep_expired_donations(as_of=now)
    assert sweep3["expired_count"] == 0
    assert sweep3["expired_donation_ids"] == []

# ---------------------------------------------------------------------------
# Test 10: Direct expiry call must not expire a future-expiry donation
# ---------------------------------------------------------------------------
def test_10_direct_expiry_does_not_expire_future_donation():
    """A direct expiry call must respect the supplied current time."""
    _, prov_token = _register_provider(_unique_email("prov_future_expiry"))
    now = datetime.now(timezone.utc)

    res = _create_donation(
        prov_token,
        title="Future Expiry Food Batch",
        expiry_time=now + timedelta(hours=2),
    )
    assert res.status_code == 201, res.text
    donation_id = res.json()["id"]

    result = ExpiryService.expire_donation(donation_id, now=now)

    assert result is not None
    assert result["status"] == "AVAILABLE"

    with SessionLocal() as db:
        donation_row = db.get(DonationORM, donation_id)
        assert donation_row is not None
        assert donation_row.status == "AVAILABLE"
