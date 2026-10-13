from __future__ import annotations

import concurrent.futures
import threading
import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import pytest

from unittest.mock import patch
import sqlalchemy as sa
from sqlalchemy.orm import Query

from app.core.database import SessionLocal, engine
from app.core.store import store
from app.main import app
from app.models import DonationORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM
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
        match_a_id = match_a.id

    # Recipient B attempts to accept Recipient A's match
    res_b_accept = client.post(f"/api/v1/matches/{match_a_id}/accept", headers={"Authorization": f"Bearer {recip_b_token}"})
    assert res_b_accept.status_code == 403
    assert res_b_accept.json()["detail"]["error"]["code"] == "FORBIDDEN"
    assert "not assigned to this match" in res_b_accept.text.lower()

    # Recipient B attempts to reject Recipient A's match
    res_b_reject = client.post(f"/api/v1/matches/{match_a_id}/reject", headers={"Authorization": f"Bearer {recip_b_token}"})
    assert res_b_reject.status_code == 403
    assert res_b_reject.json()["detail"]["error"]["code"] == "FORBIDDEN"
    assert "not assigned to this match" in res_b_reject.text.lower()


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


def test_12_donation_matches_api_authoritative_postgres_over_stale_memory():
    """Verify GET /api/v1/donations/{id}/matches queries PostgreSQL authoritatively.

    If PostgreSQL has 0 matches for a valid donation, it must return an empty list [],
    even if stale in-memory matches linger in store.matches.
    """
    donor_id, donor_token = _register_provider(_unique_email("match_donor_12"))
    don_id = _create_donation(donor_token, title="Solo Donation", food_type="BAKERY", perishable=False, quantity=15)

    with SessionLocal() as db:
        db.query(MatchORM).filter(MatchORM.donation_id == don_id).delete()
        db.commit()

    fake_match_id = f"fake_stale_match_{uuid.uuid4().hex[:8]}"
    store.matches[fake_match_id] = {
        "id": fake_match_id,
        "donation_id": don_id,
        "recipient_id": "fake_recipient_id",
        "compatibility_score": 0.99,
        "distance_km": 1.2,
        "matched_factors": {},
        "status": "PROPOSED",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    try:
        res = client.get(
            f"/api/v1/donations/{don_id}/matches",
            headers={"Authorization": f"Bearer {donor_token}"},
        )
        assert res.status_code == 200
        matches = res.json()
        assert matches == [], "Must return empty list from authoritative DB, ignoring stale store.matches"
    finally:
        store.matches.pop(fake_match_id, None)


def test_13_reservation_service_does_not_resurrect_deleted_db_records_in_production(monkeypatch):
    """Verify ReservationService.accept_match refuses to resurrect deleted DB matches in production."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_13"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_13"), storage_types=["DRY"])
    don_id = _create_donation(donor_token, title="Resurrection Test", food_type="BAKERY", perishable=False, quantity=25)

    with SessionLocal() as db:
        match_row = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_id).first()
        assert match_row is not None
        match_id = match_row.id
        db.delete(match_row)
        db.commit()

    assert match_id in store.matches

    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)

    with pytest.raises(ValueError, match="Match not found"):
        ReservationService.accept_match(match_id, recip_id)

    with SessionLocal() as db:
        assert db.get(MatchORM, match_id) is None


def test_14_rejecting_inactive_match_states_fails_with_400():
    """Verify rejecting an EXPIRED or COMPLETED match fails with 400 INVALID_STATE."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_14"))
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_14"), storage_types=["DRY"])
    don_id = _create_donation(donor_token, title="Inactive Rejection Test", food_type="BAKERY", perishable=False, quantity=20)

    with SessionLocal() as db:
        m = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_id).first()
        assert m is not None
        match_id = m.id

    # 1. Test rejecting an EXPIRED match
    with SessionLocal() as db:
        m_row = db.get(MatchORM, match_id)
        m_row.status = "EXPIRED"
        db.commit()

    rej_res = client.post(f"/api/v1/matches/{match_id}/reject", headers={"Authorization": f"Bearer {recip_token}"})
    assert rej_res.status_code == 400
    assert rej_res.json()["detail"]["error"]["code"] == "INVALID_STATE"
    assert "cannot reject a match in expired status" in rej_res.json()["detail"]["error"]["message"].lower()

    # 2. Test rejecting a COMPLETED match
    with SessionLocal() as db:
        m_row = db.get(MatchORM, match_id)
        m_row.status = "COMPLETED"
        db.commit()

    rej_res2 = client.post(f"/api/v1/matches/{match_id}/reject", headers={"Authorization": f"Bearer {recip_token}"})
    assert rej_res2.status_code == 400
    assert rej_res2.json()["detail"]["error"]["code"] == "INVALID_STATE"
    assert "cannot reject a match in completed status" in rej_res2.json()["detail"]["error"]["message"].lower()

    # 3. Test rejecting an ACCEPTED match
    with SessionLocal() as db:
        m_row = db.get(MatchORM, match_id)
        m_row.status = "ACCEPTED"
        db.commit()

    rej_res3 = client.post(f"/api/v1/matches/{match_id}/reject", headers={"Authorization": f"Bearer {recip_token}"})
    assert rej_res3.status_code == 400
    assert rej_res3.json()["detail"]["error"]["code"] == "INVALID_STATE"
    assert "cannot reject a match in accepted status" in rej_res3.json()["detail"]["error"]["message"].lower()

    # 4. Test rejecting an already REJECTED match
    with SessionLocal() as db:
        m_row = db.get(MatchORM, match_id)
        m_row.status = "REJECTED"
        db.commit()

    rej_res4 = client.post(f"/api/v1/matches/{match_id}/reject", headers={"Authorization": f"Bearer {recip_token}"})
    assert rej_res4.status_code == 400
    assert rej_res4.json()["detail"]["error"]["code"] == "INVALID_STATE"
    assert "cannot reject a match in rejected status" in rej_res4.json()["detail"]["error"]["message"].lower()


def test_15_rejecting_match_for_cancelled_donation_does_not_promote_competing_candidate():
    """Verify rejecting a match for a cancelled donation does not promote another candidate or notify anyone."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_15"))
    recip_1_id, recip_1_token = _register_recipient(_unique_email("match_recip_15a"), storage_types=["DRY"], lat=17.660, lng=75.908)
    recip_2_id, recip_2_token = _register_recipient(_unique_email("match_recip_15b"), storage_types=["DRY"], lat=17.662, lng=75.910)

    don_id = _create_donation(donor_token, title="To Be Cancelled Donation", food_type="BAKERY", perishable=False, quantity=30)

    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_1_id).first()
        m2 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_2_id).first()
        assert m1 is not None
        assert m2 is not None
        m1_id = m1.id
        m2_id = m2.id

        # Simulate scenario where donation was cancelled by donor
        don = db.get(DonationORM, don_id)
        don.status = "CANCELLED"
        # Reset m1 to NOTIFIED so it is an active match being rejected while donation is CANCELLED
        m1.status = "NOTIFIED"
        m2.status = "PROPOSED"
        db.commit()

    # Clear notifications for recip_2
    with SessionLocal() as db:
        db.query(NotificationORM).filter(NotificationORM.user_id == recip_2_id).delete()
        db.commit()

    # Recipient 1 rejects their match
    res = client.post(f"/api/v1/matches/{m1_id}/reject", headers={"Authorization": f"Bearer {recip_1_token}"})
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "REJECTED"

    # Verify candidate 2 was NOT promoted to NOTIFIED and received NO notification
    with SessionLocal() as db:
        m2_fresh = db.get(MatchORM, m2_id)
        assert m2_fresh.status == "PROPOSED", "Candidate 2 must remain PROPOSED because donation is CANCELLED"

        notif = db.query(NotificationORM).filter(
            NotificationORM.user_id == recip_2_id,
            NotificationORM.match_id == m2_id,
        ).first()
        assert notif is None, "No notification should be created for candidate 2 when donation is CANCELLED"


def test_16_accept_and_reject_by_unauthorized_recipient_returns_403():
    """Verify accepting or rejecting another recipient's match returns HTTP 403 FORBIDDEN."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_16"))
    recip_1_id, recip_1_token = _register_recipient(_unique_email("match_recip_16a"), storage_types=["DRY"], lat=17.660, lng=75.908)
    recip_2_id, recip_2_token = _register_recipient(_unique_email("match_recip_16b"), storage_types=["DRY"], lat=17.662, lng=75.910)

    don_id = _create_donation(donor_token, title="Cross Recipient Test", food_type="BAKERY", perishable=False, quantity=25)

    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_1_id).first()
        assert m1 is not None
        m1_id = m1.id

    # Recipient 2 tries to accept Recipient 1's match
    accept_res = client.post(f"/api/v1/matches/{m1_id}/accept", headers={"Authorization": f"Bearer {recip_2_token}"})
    assert accept_res.status_code == 403
    assert accept_res.json()["detail"]["error"]["code"] == "FORBIDDEN"
    assert "not assigned to this match" in accept_res.json()["detail"]["error"]["message"]

    # Recipient 2 tries to reject Recipient 1's match
    reject_res = client.post(f"/api/v1/matches/{m1_id}/reject", headers={"Authorization": f"Bearer {recip_2_token}"})
    assert reject_res.status_code == 403
    assert reject_res.json()["detail"]["error"]["code"] == "FORBIDDEN"
    assert "not assigned to this match" in reject_res.json()["detail"]["error"]["message"]


def test_17_successful_rejection_promotes_next_eligible_candidate():
    """Verify that rejecting a valid match promotes the next eligible proposed candidate and notifies them."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_17"))
    recip_1_id, recip_1_token = _register_recipient(_unique_email("match_recip_17a"), storage_types=["DRY"], lat=17.660, lng=75.908)
    recip_2_id, recip_2_token = _register_recipient(_unique_email("match_recip_17b"), storage_types=["DRY"], lat=17.662, lng=75.910)

    don_id = _create_donation(donor_token, title="Active Reallocation Test", food_type="BAKERY", perishable=False, quantity=40)

    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_1_id).first()
        m2 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_2_id).first()
        assert m1 is not None
        assert m2 is not None
        m1_id = m1.id
        m2_id = m2.id

    # Recipient 1 rejects their match
    res = client.post(f"/api/v1/matches/{m1_id}/reject", headers={"Authorization": f"Bearer {recip_1_token}"})
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "REJECTED"

    # Some eligible proposed candidate was promoted to NOTIFIED and received a notification
    with SessionLocal() as db:
        notified_match = db.query(MatchORM).filter(
            MatchORM.donation_id == don_id,
            MatchORM.status == "NOTIFIED",
        ).first()
        assert notified_match is not None
        assert notified_match.id != m1_id

        notif = db.query(NotificationORM).filter(
            NotificationORM.user_id == notified_match.recipient_id,
            NotificationORM.match_id == notified_match.id,
            NotificationORM.type == "MATCH_ALERT",
        ).first()
        assert notif is not None


def test_18_concurrent_acceptance_and_rejection_leaves_consistent_state():
    """Verify that concurrent acceptance and rejection on the same donation leaves consistent database states."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_18"))
    recip_1_id, recip_1_token = _register_recipient(_unique_email("match_recip_18a"), storage_types=["DRY"], lat=17.660, lng=75.908)
    recip_2_id, recip_2_token = _register_recipient(_unique_email("match_recip_18b"), storage_types=["DRY"], lat=17.662, lng=75.910)

    don_id = _create_donation(donor_token, title="Race Test", food_type="BAKERY", perishable=False, quantity=40)

    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_1_id).first()
        m2 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_2_id).first()
        assert m1 is not None
        assert m2 is not None
        m1_id = m1.id
        m2_id = m2.id

    barrier = threading.Barrier(2)
    results = []

    def accept_task():
        barrier.wait()
        res = client.post(f"/api/v1/matches/{m1_id}/accept", headers={"Authorization": f"Bearer {recip_1_token}"})
        return ("ACCEPT", res.status_code, res.json())

    def reject_task():
        barrier.wait()
        res = client.post(f"/api/v1/matches/{m2_id}/reject", headers={"Authorization": f"Bearer {recip_2_token}"})
        return ("REJECT", res.status_code, res.json())

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(accept_task)
        f2 = executor.submit(reject_task)
        results = [f1.result(), f2.result()]

    accept_res = next(r for r in results if r[0] == "ACCEPT")
    reject_res = next(r for r in results if r[0] == "REJECT")

    assert accept_res[1] == 200

    with SessionLocal() as db:
        don = db.get(DonationORM, don_id)
        assert don.status == "RESERVED"
        m1_row = db.get(MatchORM, m1_id)
        assert m1_row.status == "ACCEPTED"
        m2_row = db.get(MatchORM, m2_id)

        if reject_res[1] == 200:
            assert m2_row.status == "REJECTED"
        else:
            assert reject_res[1] == 400
            assert m2_row.status == "EXPIRED"

        active_matches = db.query(MatchORM).filter(
            MatchORM.donation_id == don_id,
            MatchORM.status.in_(["PROPOSED", "NOTIFIED"]),
        ).all()
        assert len(active_matches) == 0


def test_19_rejection_when_donation_is_reserved_completed_or_missing():
    """Verify that rejection does not reallocate when donation is reserved, completed, or missing,
    and missing donation rolls back with an error."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_19"))
    recip_1_id, recip_1_token = _register_recipient(_unique_email("match_recip_19a"), storage_types=["DRY"], lat=17.660, lng=75.908)
    recip_2_id, recip_2_token = _register_recipient(_unique_email("match_recip_19b"), storage_types=["DRY"], lat=17.662, lng=75.910)

    # 1. Test when donation is RESERVED
    don_id_1 = _create_donation(donor_token, title="Reserved Donation Realloc Test", food_type="BAKERY", perishable=False, quantity=30)
    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == don_id_1, MatchORM.recipient_id == recip_1_id).first()
        m2 = db.query(MatchORM).filter(MatchORM.donation_id == don_id_1, MatchORM.recipient_id == recip_2_id).first()
        m1_id = m1.id
        m2_id = m2.id
        don1 = db.get(DonationORM, don_id_1)
        don1.status = "RESERVED"
        m1.status = "NOTIFIED"
        m2.status = "PROPOSED"
        db.commit()

    with SessionLocal() as db:
        db.query(NotificationORM).filter(NotificationORM.user_id == recip_2_id).delete()
        db.commit()

    rej_res1 = client.post(f"/api/v1/matches/{m1_id}/reject", headers={"Authorization": f"Bearer {recip_1_token}"})
    assert rej_res1.status_code == 200
    assert rej_res1.json()["data"]["status"] == "REJECTED"

    with SessionLocal() as db:
        assert db.get(MatchORM, m2_id).status == "PROPOSED"
        notif = db.query(NotificationORM).filter(NotificationORM.user_id == recip_2_id, NotificationORM.match_id == m2_id).first()
        assert notif is None

    # 2. Test when donation is COMPLETED
    don_id_2 = _create_donation(donor_token, title="Completed Donation Realloc Test", food_type="BAKERY", perishable=False, quantity=30)
    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == don_id_2, MatchORM.recipient_id == recip_1_id).first()
        m2 = db.query(MatchORM).filter(MatchORM.donation_id == don_id_2, MatchORM.recipient_id == recip_2_id).first()
        m1_id = m1.id
        m2_id = m2.id
        don2 = db.get(DonationORM, don_id_2)
        don2.status = "COMPLETED"
        m1.status = "NOTIFIED"
        m2.status = "PROPOSED"
        db.commit()

    with SessionLocal() as db:
        db.query(NotificationORM).filter(NotificationORM.user_id == recip_2_id).delete()
        db.commit()

    rej_res2 = client.post(f"/api/v1/matches/{m1_id}/reject", headers={"Authorization": f"Bearer {recip_1_token}"})
    assert rej_res2.status_code == 200
    assert rej_res2.json()["data"]["status"] == "REJECTED"

    with SessionLocal() as db:
        assert db.get(MatchORM, m2_id).status == "PROPOSED"
        notif = db.query(NotificationORM).filter(NotificationORM.user_id == recip_2_id, NotificationORM.match_id == m2_id).first()
        assert notif is None

    # 3. Test when donation is MISSING: rolls back, does not commit partial update
    don_id_3 = _create_donation(donor_token, title="Missing Donation Realloc Test", food_type="BAKERY", perishable=False, quantity=30)
    with SessionLocal() as db:
        m3 = db.query(MatchORM).filter(MatchORM.donation_id == don_id_3, MatchORM.recipient_id == recip_1_id).first()
        assert m3 is not None
        m3.status = "NOTIFIED"
        db.commit()
        orphan_id = m3.id

    orig_wfu = Query.with_for_update
    def mock_wfu(self, *args, **kwargs):
        q = orig_wfu(self, *args, **kwargs)
        try:
            if self._entity_from_pre_ent_zero().entity is DonationORM:
                return q.filter(sa.text("1=0"))
        except Exception:
            pass
        return q

    # Ensure store does not have it either so fallback resurrection does not trigger
    store.donations.pop(don_id_3, None)

    with patch.object(Query, "with_for_update", mock_wfu):
        rej_res3 = client.post(f"/api/v1/matches/{orphan_id}/reject", headers={"Authorization": f"Bearer {recip_1_token}"})
        assert rej_res3.status_code == 400
        assert rej_res3.json()["detail"]["error"]["code"] == "INVALID_STATE"
        assert "donation not found" in rej_res3.json()["detail"]["error"]["message"].lower()

    # Verify rollback: orphan match must remain NOTIFIED in database
    with SessionLocal() as db:
        fresh_orphan = db.get(MatchORM, orphan_id)
        assert fresh_orphan.status == "NOTIFIED", "Match status must not be updated if donation is missing"


def test_20_rejection_promotes_at_most_one_candidate_and_creates_one_notification():
    """Verify that rejection of an available donation promotes at most one candidate and creates at most one notification."""
    donor_id, donor_token = _register_provider(_unique_email("match_donor_20"))
    recip_1_id, recip_1_token = _register_recipient(_unique_email("match_recip_20a"), storage_types=["DRY"], lat=17.660, lng=75.908)
    recip_2_id, recip_2_token = _register_recipient(_unique_email("match_recip_20b"), storage_types=["DRY"], lat=17.662, lng=75.910)
    recip_3_id, recip_3_token = _register_recipient(_unique_email("match_recip_20c"), storage_types=["DRY"], lat=17.665, lng=75.915)

    don_id = _create_donation(donor_token, title="Three Candidate Test", food_type="BAKERY", perishable=False, quantity=60)

    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_1_id).first()
        m2 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_2_id).first()
        m3 = db.query(MatchORM).filter(MatchORM.donation_id == don_id, MatchORM.recipient_id == recip_3_id).first()
        assert m1 is not None
        assert m2 is not None
        assert m3 is not None
        m1_id = m1.id
        m2_id = m2.id
        m3_id = m3.id

        # Set explicit scores so m2 is higher rank than m3
        m1.status = "NOTIFIED"
        m2.status = "PROPOSED"
        m2.compatibility_score = 0.90
        m3.status = "PROPOSED"
        m3.compatibility_score = 0.70
        db.commit()

    # Clear previous notifications for recip_2 and recip_3
    with SessionLocal() as db:
        db.query(NotificationORM).filter(NotificationORM.user_id.in_([recip_2_id, recip_3_id])).delete()
        db.commit()

    # Recipient 1 rejects match
    res = client.post(f"/api/v1/matches/{m1_id}/reject", headers={"Authorization": f"Bearer {recip_1_token}"})
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "REJECTED"

    with SessionLocal() as db:
        # Exactly one candidate (m2) was promoted to NOTIFIED
        m2_row = db.get(MatchORM, m2_id)
        m3_row = db.get(MatchORM, m3_id)
        assert m2_row.status == "NOTIFIED", "Highest ranked proposed candidate must be NOTIFIED"
        assert m3_row.status == "PROPOSED", "Lower ranked proposed candidate must remain PROPOSED"

        # Exactly one notification was created across all candidates
        notifs_m2 = db.query(NotificationORM).filter(NotificationORM.match_id == m2_id, NotificationORM.type == "MATCH_ALERT").all()
        notifs_m3 = db.query(NotificationORM).filter(NotificationORM.match_id == m3_id, NotificationORM.type == "MATCH_ALERT").all()
        assert len(notifs_m2) == 1, "Exactly one notification for promoted match m2"
        assert len(notifs_m3) == 0, "No notifications for unpromoted match m3"


def test_21_rejecting_nonexistent_match_fails_with_400():
    """Verify rejecting a nonexistent match returns HTTP 400 with INVALID_STATE."""
    recip_id, recip_token = _register_recipient(_unique_email("match_recip_21"), storage_types=["DRY"])
    nonexistent_match_id = f"match_nonexistent_{uuid.uuid4().hex}"

    # Ensure nonexistent_match_id is not in store.matches so fallback cannot trigger
    store.matches.pop(nonexistent_match_id, None)

    with SessionLocal() as db:
        assert db.get(MatchORM, nonexistent_match_id) is None

    res = client.post(
        f"/api/v1/matches/{nonexistent_match_id}/reject",
        headers={"Authorization": f"Bearer {recip_token}"},
    )

    assert res.status_code == 400
    data = res.json()
    assert data["detail"]["success"] is False
    assert data["detail"]["error"]["code"] == "INVALID_STATE"
    assert "match not found" in data["detail"]["error"]["message"].lower()

    with SessionLocal() as db:
        assert db.get(MatchORM, nonexistent_match_id) is None
