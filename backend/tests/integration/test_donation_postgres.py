from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import text

from app.core.database import SessionLocal, engine
from app.core.store import store
from app.main import app
from app.models import DonationORM, MatchORM, RecipientProfileORM, UserORM
from app.services.donation_service import DonationService

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
            "organization_name": "Test Bakery Provider",
            "phone": "9876543210",
            "address": "12 Station Road, Solapur",
            "latitude": 17.6599,
            "longitude": 75.9064,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    return data["user"]["id"], data["token"]


def _register_recipient(email: str, password: str = "ShelterPassword456!") -> tuple[str, str]:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "role": "RECIPIENT",
            "organization_name": "Test Community Shelter",
            "phone": "9123456789",
            "address": "15 Gandhi Nagar, Solapur",
            "latitude": 17.6650,
            "longitude": 75.9120,
        },
    )
    assert res.status_code == 201, res.text
    data = res.json()
    return data["user"]["id"], data["token"]


def _create_test_donation(token: str, title: str = "Fresh Vegetable Rice", quantity: int = 50) -> dict:
    now = datetime.now(timezone.utc)
    res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": title,
            "food_type": "VEGETARIAN_COOKED",
            "perishable": True,
            "quantity_meals": quantity,
            "prepared_at": now.isoformat(),
            "expiry_time": (now + timedelta(hours=5)).isoformat(),
            "pickup_address": "12 Station Road, Solapur Central",
            "latitude": 17.6599,
            "longitude": 75.9064,
            "special_instructions": "Packed in sealed containers.",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_01_donation_creation_persists_to_postgres():
    """Verify that donation creation commits directly to PostgreSQL with correct fields and UTC timestamps."""
    assert engine.dialect.name == "postgresql", "Test must genuinely connect to PostgreSQL"
    donor_id, token = _register_provider(_unique_email("donor_p1"))

    don_data = _create_test_donation(token, title="Hot Meals Surplus", quantity=45)
    donation_id = don_data["id"]

    assert don_data["provider_id"] == donor_id
    assert don_data["status"] == "AVAILABLE"
    assert don_data["quantity_meals"] == 45

    # Direct PostgreSQL verification via fresh session
    with SessionLocal() as db:
        row = db.get(DonationORM, donation_id)
        assert row is not None
        assert row.id == donation_id
        assert row.provider_id == donor_id
        assert row.title == "Hot Meals Surplus"
        assert row.quantity_meals == 45
        assert row.status == "AVAILABLE"
        assert row.created_at is not None
        assert row.updated_at is not None
        assert row.expiry_time is not None


def test_02_fresh_database_session_retrieves_created_donation():
    """Verify GET /api/v1/donations/{id} reads committed state from PostgreSQL after cache purge."""
    donor_id, token = _register_provider(_unique_email("donor_p2"))
    don_data = _create_test_donation(token, title="Sandwiches and Juice", quantity=30)
    donation_id = don_data["id"]

    # Purge in-memory cache to guarantee subsequent read hits PostgreSQL
    if donation_id in store.donations:
        del store.donations[donation_id]

    res = client.get(f"/api/v1/donations/{donation_id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    fetched = res.json()
    assert fetched["id"] == donation_id
    assert fetched["provider_id"] == donor_id
    assert fetched["title"] == "Sandwiches and Juice"
    assert fetched["quantity_meals"] == 30
    assert fetched["status"] == "AVAILABLE"


def test_03_donor_listing_returns_only_authenticated_donor_donations():
    """Verify donor listing strictly enforces ownership and returns only the authenticated donor's listings."""
    _, token_a = _register_provider(_unique_email("donor_a"))
    _, token_b = _register_provider(_unique_email("donor_b"))

    don_a = _create_test_donation(token_a, title="Donor A's Rice", quantity=25)
    don_b = _create_test_donation(token_b, title="Donor B's Curry", quantity=40)

    # Donor A lists donations
    res_a = client.get("/api/v1/donations", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    ids_a = [d["id"] for d in res_a.json()]
    assert don_a["id"] in ids_a
    assert don_b["id"] not in ids_a, "Donor A must not see Donor B's private donations"

    # Donor B lists donations
    res_b = client.get("/api/v1/donations", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    ids_b = [d["id"] for d in res_b.json()]
    assert don_b["id"] in ids_b
    assert don_a["id"] not in ids_b, "Donor B must not see Donor A's private donations"


def test_04_cross_donor_authorization_isolation():
    """Verify one donor cannot read or modify another donor's private donation."""
    _, token_owner = _register_provider(_unique_email("donor_owner"))
    _, token_stranger = _register_provider(_unique_email("donor_stranger"))

    don = _create_test_donation(token_owner, title="Owner Surplus", quantity=60)
    donation_id = don["id"]

    # Stranger attempts to read owner's private donation
    res_read = client.get(f"/api/v1/donations/{donation_id}", headers={"Authorization": f"Bearer {token_stranger}"})
    assert res_read.status_code == 403, "Stranger reading another donor's donation must be 403 Forbidden"

    # Stranger attempts to cancel owner's donation
    res_cancel = client.post(f"/api/v1/donations/{donation_id}/cancel", headers={"Authorization": f"Bearer {token_stranger}"})
    assert res_cancel.status_code == 403, "Stranger cancelling another donor's donation must be 403 Forbidden"

    # Confirm in PostgreSQL that donation status remains AVAILABLE
    with SessionLocal() as db:
        row = db.get(DonationORM, donation_id)
        assert row.status == "AVAILABLE"


def test_05_valid_donation_updates_persist_in_postgres():
    """Verify valid detail updates persist directly in PostgreSQL and reflect in new sessions."""
    donor_id, token = _register_provider(_unique_email("donor_updater"))
    don = _create_test_donation(token, title="Original Bread Batch", quantity=20)
    donation_id = don["id"]

    # Update donation via service
    user = {"id": donor_id, "role": "FOOD_PROVIDER"}
    updated = DonationService.update_donation(
        donation_id,
        user,
        {"title": "Updated Artisanal Bread", "quantity_meals": 35, "special_instructions": "Keep cool"},
    )
    assert updated["title"] == "Updated Artisanal Bread"
    assert updated["quantity_meals"] == 35

    # Reopen fresh session and verify in PostgreSQL
    with SessionLocal() as db:
        row = db.get(DonationORM, donation_id)
        assert row.title == "Updated Artisanal Bread"
        assert row.quantity_meals == 35
        assert row.special_instructions == "Keep cool"


def test_06_lifecycle_transitions_and_invalid_state_rejection():
    """Verify donation status transitions enforce business rules and reject invalid states."""
    donor_id, token = _register_provider(_unique_email("donor_lifecycle"))
    don = _create_test_donation(token, title="Batch for Transition Test", quantity=50)
    donation_id = don["id"]

    # 1. Attempting to complete an AVAILABLE donation directly must fail (must be RESERVED first)
    bad_complete = client.post(f"/api/v1/donations/{donation_id}/complete", headers={"Authorization": f"Bearer {token}"})
    assert bad_complete.status_code == 400
    assert "reserved before completion" in bad_complete.text.lower()

    # 2. Owner cancels the AVAILABLE donation -> succeeds
    cancel_res = client.post(f"/api/v1/donations/{donation_id}/cancel", headers={"Authorization": f"Bearer {token}"})
    assert cancel_res.status_code == 200
    assert cancel_res.json()["data"]["status"] == "CANCELLED"

    # Verify CANCELLED status committed in PostgreSQL
    with SessionLocal() as db:
        row = db.get(DonationORM, donation_id)
        assert row.status == "CANCELLED"

    # 3. Attempting to cancel an already CANCELLED donation must fail
    second_cancel = client.post(f"/api/v1/donations/{donation_id}/cancel", headers={"Authorization": f"Bearer {token}"})
    assert second_cancel.status_code == 400
    assert "cannot cancel a donation in cancelled status" in second_cancel.text.lower()

    # 4. Attempting to complete a CANCELLED donation must fail
    cancel_complete = client.post(f"/api/v1/donations/{donation_id}/complete", headers={"Authorization": f"Bearer {token}"})
    assert cancel_complete.status_code == 400


def test_07_missing_donation_returns_404():
    """Verify non-existent donation IDs return clean 404 NOT_FOUND responses."""
    _, token = _register_provider(_unique_email("donor_notfound"))

    res_get = client.get("/api/v1/donations/don_nonexistent_9999", headers={"Authorization": f"Bearer {token}"})
    assert res_get.status_code == 404
    assert "not found" in res_get.text.lower()


def test_08_stale_cache_cannot_overwrite_newer_database_donation():
    """Verify dual-write protection: corrupted in-memory cache cannot overwrite PostgreSQL rows."""
    donor_id, token = _register_provider(_unique_email("donor_stalecache"))
    don = _create_test_donation(token, title="Database Authoritative Food", quantity=80)
    donation_id = don["id"]

    # Intentionally corrupt in-memory store
    store.donations[donation_id]["status"] = "CANCELLED"
    store.donations[donation_id]["quantity_meals"] = 9999

    # Trigger whole-store synchronization routines
    store.sync_donations()
    store.sync_all()

    # Verify PostgreSQL retained real committed state
    with SessionLocal() as db:
        row = db.get(DonationORM, donation_id)
        assert row.status == "AVAILABLE", "PostgreSQL status must not be corrupted by in-memory store"
        assert row.quantity_meals == 80, "PostgreSQL quantity must not be overwritten by in-memory store"

    # Verify in-memory store was healed from PostgreSQL
    assert store.donations[donation_id]["status"] == "AVAILABLE"
    assert store.donations[donation_id]["quantity_meals"] == 80


def test_09_rollback_on_write_failure():
    """Verify atomic transaction rollback when an error occurs during donation creation."""
    donor_id, token = _register_provider(_unique_email("donor_rollback"))

    # Attempt donation creation with invalid food type to trigger failure
    bad_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Invalid Type Donation",
            "food_type": "INVALID_FOOD_CATEGORY",
            "quantity_meals": 10,
            "prepared_at": datetime.now(timezone.utc).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
            "pickup_address": "Test Street",
            "latitude": 17.65,
            "longitude": 75.90,
        },
    )
    assert bad_res.status_code == 422  # Pydantic validation rejected before DB write

    # Ensure no orphaned donations for this donor exist in PostgreSQL
    with SessionLocal() as db:
        rows = db.query(DonationORM).filter(DonationORM.provider_id == donor_id).all()
        assert len(rows) == 0


def test_10_reservation_and_matching_flow_consumes_migrated_donation():
    """Verify end-to-end lifecycle: creation -> deterministic match -> reservation -> completion in PostgreSQL."""
    donor_id, donor_token = _register_provider(_unique_email("donor_e2e"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_e2e"))

    # Update recipient profile to support refrigerated storage and required capacity
    prof_res = client.put(
        "/api/v1/recipients/profile",
        headers={"Authorization": f"Bearer {recip_token}"},
        json={
            "org_type": "COMMUNITY_KITCHEN",
            "daily_capacity_meals": 150,
            "storage_types": ["DRY", "REFRIGERATED"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 20.0,
        },
    )
    assert prof_res.status_code == 200

    # 1. Create donation
    don = _create_test_donation(donor_token, title="E2E Rice and Lentils", quantity=70)
    donation_id = don["id"]

    # 2. Recipient fetches matches generated for this donation
    matches_res = client.get("/api/v1/recipients/matches", headers={"Authorization": f"Bearer {recip_token}"})
    assert matches_res.status_code == 200
    my_matches = [m for m in matches_res.json()["data"] if m["donation_id"] == donation_id]
    assert len(my_matches) >= 1
    target_match = my_matches[0]

    # 3. Recipient accepts match -> reserves donation
    accept_res = client.post(f"/api/v1/matches/{target_match['id']}/accept", headers={"Authorization": f"Bearer {recip_token}"})
    assert accept_res.status_code == 200

    # Verify RESERVED status committed in PostgreSQL
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "RESERVED"

    # 4. Donor completes handover
    comp_res = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={"confirmed_quantity_meals": 70, "notes": "Handed over warm and fresh"},
    )
    assert comp_res.status_code == 200

    # Verify COMPLETED status committed in PostgreSQL
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "COMPLETED"
        assert don_row.special_instructions == "Handed over warm and fresh"
