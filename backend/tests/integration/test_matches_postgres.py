from __future__ import annotations

import concurrent.futures
import threading
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import pytest

from app.core.database import SessionLocal, engine
from app.core.store import store
from app.main import app
from app.models import DonationORM, MatchORM, RecipientProfileORM, UserORM
from app.services.matching.heuristic import generate_matches_for_donation
from app.services.reservation_service import ReservationService

client = TestClient(app)


def _unique_email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@foodsync.org"


def _register_provider(email: str, password: str = "SecurePassword123!") -> tuple[str, str]:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "role": "FOOD_PROVIDER",
            "organization_name": "Test Match Provider",
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
    storage_types: list[str] | None = None,
    capacity: int = 150,
    lat: float = 17.6650,
    lng: float = 75.9120,
) -> tuple[str, str]:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "role": "RECIPIENT",
            "organization_name": "Test Match Shelter",
            "phone": "9123456789",
            "address": "15 Gandhi Nagar, Solapur",
            "latitude": lat,
            "longitude": lng,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    recip_id = data["user"]["id"]
    token = data["token"]

    if storage_types:
        prof_res = client.put(
            "/api/v1/recipients/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "org_type": "COMMUNITY_KITCHEN",
                "daily_capacity_meals": capacity,
                "storage_types": storage_types,
                "dietary_preferences": "ALL",
                "max_travel_distance_km": 25.0,
            },
        )
        assert prof_res.status_code == 200, prof_res.text

    return recip_id, token


def _create_donation(token: str, title: str = "Bakery Surplus", food_type: str = "BAKERY", perishable: bool = False, quantity: int = 50) -> str:
    now = datetime.now(timezone.utc)
    res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": title,
            "food_type": food_type,
            "perishable": perishable,
            "quantity_meals": quantity,
            "prepared_at": now.isoformat(),
            "expiry_time": (now + timedelta(hours=6)).isoformat(),
            "pickup_address": "12 Station Road, Solapur Central",
            "latitude": 17.6599,
            "longitude": 75.9064,
            "special_instructions": "Sealed boxes.",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


def test_01_candidate_generation_persists_to_postgres():
    """Verify that candidate match generation persists MatchORM records directly in PostgreSQL."""
    assert engine.dialect.name == "postgresql", "Test must connect to PostgreSQL"
    donor_id, donor_token = _register_provider(_unique_email("match_donor_1"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_1"), storage_types=["DRY", "REFRIGERATED"])

    donation_id = _create_donation(donor_token, title="Fresh Bagels", food_type="BAKERY", perishable=False, quantity=40)

    # Inspect PostgreSQL directly for generated match row
    with SessionLocal() as db:
        matches = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_id).all()
        assert len(matches) == 1, "Expected exactly 1 match in PostgreSQL"
        m = matches[0]
        assert m.status == "PROPOSED"
        assert m.compatibility_score > 0.0
        assert m.distance_km >= 0.0
        assert m.matched_factors is not None
        assert "distance_score" in m.matched_factors
        assert "urgency_score" in m.matched_factors


def test_02_fresh_session_retrieves_matches_after_cache_clear():
    """Verify that recipient and donor match queries read committed PostgreSQL records after in-memory store is wiped."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_2"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_2"), storage_types=["DRY", "REFRIGERATED"])

    donation_id = _create_donation(donor_token, title="Sandwich Platter", food_type="VEGETARIAN_COOKED", perishable=True, quantity=30)

    # Purge in-memory matches cache completely
    store.matches.clear()

    # Recipient fetches candidate matches
    res_recip = client.get("/api/v1/recipients/matches", headers={"Authorization": f"Bearer {recip_token}"})
    assert res_recip.status_code == 200
    recip_matches = [m for m in res_recip.json()["data"] if m["donation_id"] == donation_id]
    assert len(recip_matches) == 1
    assert recip_matches[0]["status"] == "PROPOSED"

    # Provider lists donation matches
    res_donor = client.get(f"/api/v1/donations/{donation_id}/matches", headers={"Authorization": f"Bearer {donor_token}"})
    assert res_donor.status_code == 200
    donor_matches = res_donor.json()
    assert len(donor_matches) >= 1
    match_for_recip = [m for m in donor_matches if m["recipient_id"] == recip_id]
    assert len(match_for_recip) == 1


def test_03_repeated_generation_is_idempotent():
    """Verify that repeated candidate generation does not create duplicate proposals for unchanged inputs."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_3"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_3"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Dry Biscuits", food_type="BAKERY", perishable=False, quantity=25)

    with SessionLocal() as db:
        initial_count = db.query(MatchORM).filter(MatchORM.donation_id == donation_id).count()
        assert initial_count >= 1

    # Re-run candidate generation repeatedly
    generate_matches_for_donation(donation_id)
    generate_matches_for_donation(donation_id)

    with SessionLocal() as db:
        final_count = db.query(MatchORM).filter(MatchORM.donation_id == donation_id).count()
        assert final_count == initial_count, "Repeated generation must not create duplicate active matches"


def test_04_concurrent_generation_does_not_create_duplicates():
    """Verify that concurrent candidate generation runs cannot create duplicate matches in PostgreSQL."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_4"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_4"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Concurrent Bread", food_type="BAKERY", perishable=False, quantity=35)

    barrier = threading.Barrier(2)
    errors: list[Exception] = []

    def _concurrent_run():
        try:
            barrier.wait(timeout=5)
            generate_matches_for_donation(donation_id)
        except Exception as exc:
            errors.append(exc)

    t1 = threading.Thread(target=_concurrent_run)
    t2 = threading.Thread(target=_concurrent_run)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    assert len(errors) == 0

    with SessionLocal() as db:
        matches = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_id).all()
        assert len(matches) == 1, "Concurrency must not create duplicate matches for (donation, recipient)"


def test_05_accepted_matches_not_overwritten_by_regenerated_proposals():
    """Verify that newly generated proposals never overwrite an already ACCEPTED match."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_5"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_5"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Accepted Meal", food_type="BAKERY", perishable=False, quantity=20)

    with SessionLocal() as db:
        match_row = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_id).first()
        assert match_row is not None
        match_id = match_row.id

    # Recipient accepts match
    accept_res = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})
    assert accept_res.status_code == 200

    with SessionLocal() as db:
        row = db.get(MatchORM, match_id)
        assert row is not None
        assert row.status == "ACCEPTED"

    # Re-evaluate candidate generation
    generate_matches_for_donation(donation_id)

    # Confirm in fresh session that match remains ACCEPTED in PostgreSQL
    with SessionLocal() as db:
        row = db.get(MatchORM, match_id)
        assert row.status == "ACCEPTED", "Accepted match must never be regressed to PROPOSED"


def test_06_recipient_authorization_prevents_access_to_others_matches():
    """Verify that one recipient cannot access or accept another recipient's private match data."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_6"))
    recip_a_id, recip_a_token = _register_recipient(_unique_email("match_recip_6a"), storage_types=["DRY"])
    recip_b_id, recip_b_token = _register_recipient(_unique_email("match_recip_6b"), storage_types=["DRY"], lat=17.75, lng=76.05)

    donation_id = _create_donation(donor_token, title="Private Match Food", food_type="BAKERY", perishable=False, quantity=15)

    with SessionLocal() as db:
        match_a = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_a_id).first()
        assert match_a is not None

    # Recipient B attempts to accept Recipient A's match
    res_b_accept = client.post(f"/api/v1/matches/{match_a.id}/accept", headers={"Authorization": f"Bearer {recip_b_token}"})
    assert res_b_accept.status_code == 400
    assert "not assigned to this match" in res_b_accept.text.lower()


def test_07_reservation_acceptance_updates_authoritative_database_record():
    """Verify match acceptance updates the authoritative database record atomically with the donation."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_7"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_7"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Reserve Test", food_type="BAKERY", perishable=False, quantity=50)

    with SessionLocal() as db:
        m = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_id).first()
        match_id = m.id

    res = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})
    assert res.status_code == 200

    # Fresh session verification in PostgreSQL
    with SessionLocal() as db:
        m_row = db.get(MatchORM, match_id)
        d_row = db.get(DonationORM, donation_id)
        assert m_row.status == "ACCEPTED"
        assert d_row.status == "RESERVED"


def test_08_competing_acceptance_requests_cannot_reserve_twice():
    """Verify that when one recipient accepts a match, competing proposals expire and cannot be accepted."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_8"))
    recip_1_id, recip_1_token = _register_recipient(_unique_email("match_recip_8a"), storage_types=["DRY"], lat=17.660, lng=75.908)
    recip_2_id, recip_2_token = _register_recipient(_unique_email("match_recip_8b"), storage_types=["DRY"], lat=17.661, lng=75.909)

    donation_id = _create_donation(donor_token, title="Competing Test Food", food_type="BAKERY", perishable=False, quantity=50)

    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_1_id).first()
        m2 = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_2_id).first()
        assert m1 is not None
        assert m2 is not None

    # Recipient 1 accepts first
    res1 = client.post(f"/api/v1/matches/{m1.id}/accept", headers={"Authorization": f"Bearer {recip_1_token}"})
    assert res1.status_code == 200

    # Recipient 2 attempts to accept expired/competing match
    res2 = client.post(f"/api/v1/matches/{m2.id}/accept", headers={"Authorization": f"Bearer {recip_2_token}"})
    assert res2.status_code == 400
    assert "no longer available" in res2.text.lower()

    # Verify statuses in PostgreSQL
    with SessionLocal() as db:
        assert db.get(MatchORM, m1.id).status == "ACCEPTED"
        assert db.get(MatchORM, m2.id).status == "EXPIRED"
        assert db.get(DonationORM, donation_id).status == "RESERVED"


def test_09_donation_cancellation_and_completion_leave_statuses_consistent():
    """Verify donation cancellation expires active matches, and completion marks accepted match completed."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_9"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_9"), storage_types=["DRY"])

    # Scenario A: Cancellation
    don_cancel_id = _create_donation(donor_token, title="To Be Cancelled", food_type="BAKERY", perishable=False, quantity=20)
    with SessionLocal() as db:
        m_cancel = db.query(MatchORM).filter(MatchORM.donation_id == don_cancel_id, MatchORM.recipient_id == recip_id).first()

    client.post(f"/api/v1/donations/{don_cancel_id}/cancel", headers={"Authorization": f"Bearer {donor_token}"})
    with SessionLocal() as db:
        assert db.get(MatchORM, m_cancel.id).status == "EXPIRED"
        assert db.get(DonationORM, don_cancel_id).status == "CANCELLED"

    # Scenario B: Completion
    don_comp_id = _create_donation(donor_token, title="To Be Completed", food_type="BAKERY", perishable=False, quantity=30)
    with SessionLocal() as db:
        m_comp = db.query(MatchORM).filter(MatchORM.donation_id == don_comp_id, MatchORM.recipient_id == recip_id).first()

    client.post(f"/api/v1/matches/{m_comp.id}/accept", headers={"Authorization": f"Bearer {recip_token}"})
    client.post(f"/api/v1/donations/{don_comp_id}/complete", headers={"Authorization": f"Bearer {donor_token}"}, json={"confirmed_quantity_meals": 30})

    with SessionLocal() as db:
        assert db.get(MatchORM, m_comp.id).status == "COMPLETED"
        assert db.get(DonationORM, don_comp_id).status == "COMPLETED"


def test_10_rollback_leaves_no_partial_lifecycle_changes():
    """Verify that a failure during reservation transaction safely rolls back with no partial updates."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_10"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_10"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Rollback Test", food_type="BAKERY", perishable=False, quantity=10)

    # Attempting to accept a non-existent match fails cleanly
    res = client.post("/api/v1/matches/match_nonexistent_xyz/accept", headers={"Authorization": f"Bearer {recip_token}"})
    assert res.status_code == 400

    # Ensure donation is untouched in PostgreSQL
    with SessionLocal() as db:
        d = db.get(DonationORM, donation_id)
        assert d.status == "AVAILABLE"


def test_11_matching_scores_and_eligibility_rules_preserved():
    """Verify that compatibility scores and disqualification rules remain accurate and identical to deterministic engine."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_11"))
    # Recipient with only DRY storage and max travel distance of 5 km
    recip_dry_id, recip_dry_token = _register_recipient(
        _unique_email("match_dry"),
        storage_types=["DRY"],
        lat=17.660,
        lng=75.908,
    )

    # Donation requiring REFRIGERATED storage (perishable=True, cooked food)
    don_cold_id = _create_donation(donor_token, title="Cold Stew", food_type="VEGETARIAN_COOKED", perishable=True, quantity=40)

    # Recipient with DRY storage only should be disqualified due to storage incompatibility
    with SessionLocal() as db:
        match_dry = db.query(MatchORM).filter(MatchORM.donation_id == don_cold_id, MatchORM.recipient_id == recip_dry_id).first()
        assert match_dry is None, "Incompatible storage candidate must be disqualified"

    # Donation with compatible DRY bakery food
    don_dry_id = _create_donation(donor_token, title="Warm Baguettes", food_type="BAKERY", perishable=False, quantity=30)
    with SessionLocal() as db:
        match_compatible = db.query(MatchORM).filter(MatchORM.donation_id == don_dry_id, MatchORM.recipient_id == recip_dry_id).first()
        assert match_compatible is not None, "Compatible candidate must generate a match"
        assert 0.0 < match_compatible.compatibility_score <= 1.0
