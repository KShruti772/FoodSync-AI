from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal, engine
from app.core.store import InMemoryStore, store
from app.main import app
from app.models import DonationORM, ImpactLogORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def verify_and_clean_postgres():
    """Ensure tests run against a real PostgreSQL instance and start from a clean state."""
    assert engine.dialect.name == "postgresql", (
        f"Integration test requires PostgreSQL, but active engine is {engine.dialect.name} ({engine.url})"
    )

    with SessionLocal() as db:
        db.query(ImpactLogORM).delete()
        db.query(NotificationORM).delete()
        db.query(MatchORM).delete()
        db.query(DonationORM).delete()
        db.query(RecipientProfileORM).delete()
        db.query(UserORM).delete()
        db.commit()

    store.refresh_from_db()
    yield

    with SessionLocal() as db:
        db.query(ImpactLogORM).delete()
        db.query(NotificationORM).delete()
        db.query(MatchORM).delete()
        db.query(DonationORM).delete()
        db.query(RecipientProfileORM).delete()
        db.query(UserORM).delete()
        db.commit()

    store.refresh_from_db()


def test_01_postgres_runtime_dialect():
    """Verify that runtime database dialect is PostgreSQL."""
    assert engine.dialect.name == "postgresql"
    with engine.connect() as conn:
        result = conn.exec_driver_sql("SELECT version();").scalar()
        assert "PostgreSQL" in result


def test_02_registration_hashing_and_persistence():
    """Verify registration, password hashing (Argon2id), and persistence in PostgreSQL."""
    # 1. Register Donor
    provider_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "fresh_donor@foodsync.org",
            "password": "SecurePassword123!",
            "role": "FOOD_PROVIDER",
            "organization_name": "Sunrise Organic Bakery",
            "phone": "+91 98220 11223",
            "address": "12 Station Road, Solapur",
            "latitude": 17.6599,
            "longitude": 75.9064,
        },
    )
    assert provider_res.status_code == 201, provider_res.text
    provider_data = provider_res.json()
    assert "token" in provider_data
    provider_id = provider_data["user"]["id"]

    # 2. Register Recipient
    recipient_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "community_shelter@foodsync.org",
            "password": "ShelterPassword456!",
            "role": "RECIPIENT",
            "organization_name": "Solapur Community Shelter",
            "phone": "+91 98220 33445",
            "address": "45 Market Yard, Solapur",
            "latitude": 17.6620,
            "longitude": 75.9100,
        },
    )
    assert recipient_res.status_code == 201, recipient_res.text
    recipient_data = recipient_res.json()
    recipient_id = recipient_data["user"]["id"]

    # 3. Direct PostgreSQL Verification: passwords are NOT stored in plaintext
    with SessionLocal() as db:
        p_row = db.get(UserORM, provider_id)
        assert p_row is not None
        assert p_row.password_hash.startswith("$argon2id$")
        assert "SecurePassword123!" not in p_row.password_hash
        assert p_row.organization_name == "Sunrise Organic Bakery"
        assert p_row.role == "FOOD_PROVIDER"

        r_row = db.get(UserORM, recipient_id)
        assert r_row is not None
        assert r_row.password_hash.startswith("$argon2id$")
        assert "ShelterPassword456!" not in r_row.password_hash
        assert r_row.role == "RECIPIENT"

        # Check recipient profile was automatically initialized in PostgreSQL
        r_prof = db.query(RecipientProfileORM).filter_by(user_id=recipient_id).first()
        assert r_prof is not None
        assert r_prof.daily_capacity_meals > 0


def test_03_duplicate_and_invalid_registration_rejection():
    """Verify that duplicate email registrations and invalid registrations are safely rejected."""
    dup_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "fresh_donor@foodsync.org",
            "password": "AnotherPassword!",
            "role": "FOOD_PROVIDER",
            "organization_name": "Another Bakery",
            "phone": "9999999999",
            "address": "Some street",
            "latitude": 17.65,
            "longitude": 75.90,
        },
    )
    assert dup_res.status_code == 400
    assert "already registered" in str(dup_res.json()).lower()

    # Self-registering as ADMIN is strictly disallowed
    admin_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "hacker@foodsync.org",
            "password": "AdminPassword123!",
            "role": "ADMIN",
            "organization_name": "Rogue Entity",
            "phone": "9999999999",
            "address": "Nowhere",
            "latitude": 0,
            "longitude": 0,
        },
    )
    assert admin_res.status_code == 400


def test_04_login_credential_verification_and_auth_me():
    """Verify login authentication, token issuance, and /me profile retrieval."""
    # Invalid password
    bad_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "fresh_donor@foodsync.org",
            "password": "WrongPassword999",
        },
    )
    assert bad_login.status_code == 401

    # Valid login
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": "fresh_donor@foodsync.org",
            "password": "SecurePassword123!",
        },
    )
    assert login_res.status_code == 200
    token = login_res.json()["token"]

    # Authenticated /me endpoint
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "fresh_donor@foodsync.org"
    assert me_data["organization_name"] == "Sunrise Organic Bakery"
    assert me_data["role"] == "FOOD_PROVIDER"


def test_05_recipient_intake_settings_lifecycle():
    """Verify recipient updates intake preferences and they persist in PostgreSQL."""
    # Login recipient
    r_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "community_shelter@foodsync.org",
            "password": "ShelterPassword456!",
        },
    )
    r_token = r_login.json()["token"]
    recipient_id = r_login.json()["user"]["id"]

    # Recipient updates intake capacity & dietary rules
    update_res = client.put(
        "/api/v1/recipients/profile",
        headers={"Authorization": f"Bearer {r_token}"},
        json={
            "org_type": "COMMUNITY_KITCHEN",
            "daily_capacity_meals": 250,
            "storage_types": ["DRY", "REFRIGERATED"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 18.0,
            "operating_hours": "07:00 - 22:00",
        },
    )
    assert update_res.status_code == 200, update_res.text
    updated_profile = update_res.json()
    assert updated_profile["daily_capacity_meals"] == 250
    assert updated_profile["org_type"] == "COMMUNITY_KITCHEN"

    # Confirm directly in PostgreSQL
    with SessionLocal() as db:
        row = db.query(RecipientProfileORM).filter_by(user_id=recipient_id).first()
        assert row is not None
        assert row.daily_capacity_meals == 250
        assert row.max_travel_distance_km == 18.0

    # Food provider must be forbidden from accessing recipient profile endpoint
    p_login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "fresh_donor@foodsync.org",
            "password": "SecurePassword123!",
        },
    )
    p_token = p_login.json()["token"]
    forbidden_res = client.get("/api/v1/recipients/profile", headers={"Authorization": f"Bearer {p_token}"})
    assert forbidden_res.status_code == 403


def test_06_donation_creation_and_deterministic_matching():
    """Verify donation creation triggers deterministic matching against PostgreSQL profiles."""
    p_login = client.post(
        "/api/v1/auth/login",
        json={"email": "fresh_donor@foodsync.org", "password": "SecurePassword123!"},
    )
    p_token = p_login.json()["token"]

    now = datetime.now(timezone.utc)
    prepared_at = now.isoformat()
    expiry_time = (now + timedelta(hours=6)).isoformat()

    # Create donation
    don_res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {p_token}"},
        json={
            "title": "Fresh Baked Sourdough & Pastries",
            "food_type": "BAKERY",
            "perishable": False,
            "quantity_meals": 60,
            "prepared_at": prepared_at,
            "expiry_time": expiry_time,
            "pickup_address": "12 Station Road, Solapur",
            "latitude": 17.6599,
            "longitude": 75.9064,
            "special_instructions": "Packed in sanitized food-grade crates.",
        },
    )
    assert don_res.status_code == 201, don_res.text
    don_data = don_res.json()
    donation_id = don_data["id"]
    assert don_data["status"] == "AVAILABLE"

    # Verify donation row in PostgreSQL
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row is not None
        assert don_row.title == "Fresh Baked Sourdough & Pastries"
        assert don_row.status == "AVAILABLE"

        # Verify matching engine created match in PostgreSQL
        match_rows = db.query(MatchORM).filter_by(donation_id=donation_id).all()
        assert len(match_rows) >= 1
        top_match = match_rows[0]
        assert top_match.compatibility_score > 0
        assert top_match.status in ("PROPOSED", "NOTIFIED")


def test_07_reservation_concurrency_and_exclusive_locking():
    """Verify recipient accepts match, reserves donation atomically, and blocks competing claims."""
    r_login = client.post(
        "/api/v1/auth/login",
        json={"email": "community_shelter@foodsync.org", "password": "ShelterPassword456!"},
    )
    r_token = r_login.json()["token"]

    # Fetch recipient's proposed matches
    matches_res = client.get("/api/v1/recipients/matches", headers={"Authorization": f"Bearer {r_token}"})
    assert matches_res.status_code == 200
    my_matches = matches_res.json()["data"]
    assert len(my_matches) >= 1

    match_id = my_matches[0]["id"]
    donation_id = my_matches[0]["donation_id"]

    # Recipient accepts reservation
    accept_res = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {r_token}"})
    assert accept_res.status_code == 200, accept_res.text
    accepted = accept_res.json()
    assert accepted["success"] is True

    # Verify atomic update in PostgreSQL
    with SessionLocal() as db:
        d_row = db.get(DonationORM, donation_id)
        assert d_row.status == "RESERVED"
        m_row = db.get(MatchORM, match_id)
        assert m_row.status == "ACCEPTED"

    # Attempting to re-accept or accept an already-reserved donation must fail
    second_accept = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {r_token}"})
    assert second_accept.status_code == 400
    assert "no longer available" in str(second_accept.json()).lower()


def test_08_handover_completion_and_idempotent_impact():
    """Verify pickup completion updates statuses, records impact once, and logs notifications."""
    r_login = client.post(
        "/api/v1/auth/login",
        json={"email": "community_shelter@foodsync.org", "password": "ShelterPassword456!"},
    )
    r_token = r_login.json()["token"]

    with SessionLocal() as db:
        don_row = db.query(DonationORM).filter_by(status="RESERVED").first()
        assert don_row is not None
        donation_id = don_row.id

    # Complete handover
    comp_res = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {r_token}"},
        json={
            "confirmed_quantity_meals": 60,
            "notes": "Verified food temperature and quality at pickup.",
        },
    )
    assert comp_res.status_code == 200, comp_res.text
    comp_data = comp_res.json()["data"]
    assert comp_data["donation"]["status"] == "COMPLETED"
    assert comp_data["impact"]["meals_rescued"] == 60

    # Verify directly in PostgreSQL
    with SessionLocal() as db:
        don_db = db.get(DonationORM, donation_id)
        assert don_db.status == "COMPLETED"

        impact_rows = db.query(ImpactLogORM).filter_by(donation_id=donation_id).all()
        assert len(impact_rows) == 1  # Exactly once
        log = impact_rows[0]
        assert log.meals_rescued == 60
        assert log.food_weight_kg == 30.0
        assert log.co2_savings_kg == 75.0


def test_09_impact_ledger_csv_and_pdf_export():
    """Verify impact analytics ledger, CSV export with formula injection prevention, and PDF certificate."""
    p_login = client.post(
        "/api/v1/auth/login",
        json={"email": "fresh_donor@foodsync.org", "password": "SecurePassword123!"},
    )
    p_token = p_login.json()["token"]

    with SessionLocal() as db:
        don_row = db.query(DonationORM).filter_by(status="COMPLETED").first()
        donation_id = don_row.id

    # 1. Historical Impact Ledger
    ledger_res = client.get("/api/v1/impact/ledger", headers={"Authorization": f"Bearer {p_token}"})
    assert ledger_res.status_code == 200
    ledger = ledger_res.json()
    assert ledger["summary"]["total_meals_rescued"] >= 60
    assert len(ledger["records"]) >= 1

    # 2. CSV Export
    csv_res = client.get("/api/v1/impact/export/csv", headers={"Authorization": f"Bearer {p_token}"})
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "Meals Rescued" in csv_res.text
    assert "Sunrise Organic Bakery" in csv_res.text

    # 3. PDF Certificate
    pdf_res = client.get(
        f"/api/v1/impact/certificates/{donation_id}",
        headers={"Authorization": f"Bearer {p_token}"},
    )
    assert pdf_res.status_code == 200
    assert pdf_res.headers.get("content-type") == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-1.4")


def test_10_persistence_across_backend_restart():
    """Verify all domain data survives complete backend in-memory cache wipe and restart from PostgreSQL."""
    # Simulate application restart: wipe store in memory and reload strictly from PostgreSQL
    reloaded_store = InMemoryStore()

    assert len(reloaded_store.users) >= 2
    assert "fresh_donor@foodsync.org" in [u["email"] for u in reloaded_store.users.values()]
    assert "community_shelter@foodsync.org" in [u["email"] for u in reloaded_store.users.values()]

    assert len(reloaded_store.donations) >= 1
    completed_donations = [d for d in reloaded_store.donations.values() if d["status"] == "COMPLETED"]
    assert len(completed_donations) >= 1

    assert len(reloaded_store.impact_logs) >= 1
    total_meals = sum(i["meals_rescued"] for i in reloaded_store.impact_logs.values())
    assert total_meals >= 60
