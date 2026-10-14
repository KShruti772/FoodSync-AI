from __future__ import annotations

import concurrent.futures
import threading
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal, engine
from app.core.security import create_access_token, verify_password
from app.core.store import InMemoryStore, store
from app.main import app
from app.models import DonationORM, ImpactLogORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM
from app.services.auth_service import AuthService
from app.services.recipient_service import RecipientService

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_postgres():
    """Ensure clean state in PostgreSQL and verify engine is PostgreSQL."""
    if engine.dialect.name != "postgresql":
        pytest.skip("Integration tests require PostgreSQL database engine")

    with SessionLocal() as db:
        db.query(ImpactLogORM).delete()
        db.query(NotificationORM).delete()
        db.query(MatchORM).delete()
        db.query(DonationORM).delete()
        db.query(RecipientProfileORM).delete()
        db.query(UserORM).delete()
        db.commit()

    store.users.clear()
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


def test_01_successful_registration_and_argon2id_hash_in_postgres():
    """1 & 2. Verify registration stores Argon2id hash in PostgreSQL and never plaintext."""
    payload = {
        "email": "GreenKitchen@Example.Com",
        "password": "SecurePassword123!",
        "role": "FOOD_PROVIDER",
        "organization_name": "Green Kitchen Solapur",
        "phone": "+91 98220 99887",
        "address": "45 Market Yard Road, Solapur",
        "latitude": 17.6599,
        "longitude": 75.9064,
    }
    user = AuthService.register_user(payload)
    assert user["email"] == "greenkitchen@example.com"  # Normalized
    assert user["role"] == "FOOD_PROVIDER"

    # Query directly from PostgreSQL with fresh session
    with SessionLocal() as db:
        row = db.get(UserORM, user["id"])
        assert row is not None
        assert row.email == "greenkitchen@example.com"
        assert row.password_hash.startswith("$argon2id$")
        assert "SecurePassword123!" not in row.password_hash
        assert verify_password("SecurePassword123!", row.password_hash)


def test_02_case_insensitive_login_and_invalid_credential_rejection():
    """3. Verify case-insensitive email lookup and rejection of invalid passwords."""
    payload = {
        "email": "donor_login@foodsync.org",
        "password": "CorrectPassword123!",
        "role": "FOOD_PROVIDER",
        "organization_name": "Donor Bakery",
        "phone": "+91 98220 11111",
        "address": "1 Main St",
        "latitude": 17.65,
        "longitude": 75.90,
    }
    AuthService.register_user(payload)

    # Valid login with varied casing
    logged_in = AuthService.login_user("DONOR_LOGIN@FOODSYNC.ORG", "CorrectPassword123!")
    assert logged_in["email"] == "donor_login@foodsync.org"

    # Invalid password
    with pytest.raises(ValueError, match="Invalid email or password"):
        AuthService.login_user("donor_login@foodsync.org", "WrongPassword999")

    # Non-existent email
    with pytest.raises(ValueError, match="Invalid email or password"):
        AuthService.login_user("unknown@foodsync.org", "CorrectPassword123!")


def test_03_concurrent_duplicate_registration_race():
    """4. Verify concurrent attempts to register the same normalized email handle uniqueness constraint safely."""
    email = "concurrent_user@foodsync.org"
    barrier = threading.Barrier(2)
    results: list[tuple[str, Any]] = []

    def register_worker(worker_id: int):
        barrier.wait()
        try:
            res = AuthService.register_user({
                "email": email,
                "password": f"Password{worker_id}!",
                "role": "FOOD_PROVIDER",
                "organization_name": f"Org {worker_id}",
                "phone": "+91 98220 11111",
                "address": "123 Street",
                "latitude": 17.65,
                "longitude": 75.90,
            })
            return ("SUCCESS", res)
        except Exception as exc:
            return ("ERROR", exc)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(register_worker, 1)
        f2 = executor.submit(register_worker, 2)
        results = [f1.result(), f2.result()]

    successes = [r for r in results if r[0] == "SUCCESS"]
    errors = [r for r in results if r[0] == "ERROR"]

    # Exactly one registration succeeds; the other is rejected
    assert len(successes) == 1
    assert len(errors) == 1
    assert "already registered" in str(errors[0][1]).lower()

    # PostgreSQL must contain exactly one row for this email
    with SessionLocal() as db:
        rows = db.query(UserORM).filter(UserORM.email == email).all()
        assert len(rows) == 1


def test_04_auth_me_identity_lookup_from_database():
    """5. Verify /me lookup retrieves identity from PostgreSQL even if in-memory store was cleared."""
    payload = {
        "email": "shelter_me@foodsync.org",
        "password": "Password123!",
        "role": "RECIPIENT",
        "organization_name": "Solapur Care Shelter",
        "phone": "+91 98220 22222",
        "address": "10 Station Road",
        "latitude": 17.66,
        "longitude": 75.91,
    }
    created = AuthService.register_user(payload)
    token = AuthService.create_token_for_user(created)

    # Completely wipe store from memory
    store.users.clear()

    # /me endpoint must read directly from PostgreSQL via get_current_user
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "shelter_me@foodsync.org"
    assert data["organization_name"] == "Solapur Care Shelter"
    assert data["role"] == "RECIPIENT"
    assert "password_hash" not in data


def test_05_recipient_profile_create_read_update_persistence():
    """6. Verify recipient profile create, read, and update persist directly in PostgreSQL."""
    payload = {
        "email": "recipient_persist@foodsync.org",
        "password": "Password123!",
        "role": "RECIPIENT",
        "organization_name": "Community Food Pantry",
        "phone": "+91 98220 33333",
        "address": "50 Pantry Lane",
        "latitude": 17.662,
        "longitude": 75.908,
    }
    user = AuthService.register_user(payload)
    token = AuthService.create_token_for_user(user)

    # 1. Automatic profile creation
    profile = RecipientService.get_or_create_profile(user)
    assert profile["user_id"] == user["id"]
    assert profile["daily_capacity_meals"] == 100

    # 2. Update profile via API
    update_res = client.put(
        "/api/v1/recipients/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "org_type": "COMMUNITY_KITCHEN",
            "daily_capacity_meals": 350,
            "storage_types": ["DRY", "REFRIGERATED"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 20.0,
            "operating_hours": "08:00 - 20:00",
        },
    )
    assert update_res.status_code == 200
    res_data = update_res.json()
    assert res_data["daily_capacity_meals"] == 350
    assert res_data["org_type"] == "COMMUNITY_KITCHEN"
    assert res_data["storage_types"] == ["DRY", "REFRIGERATED"]

    # 3. Direct verification in PostgreSQL
    with SessionLocal() as db:
        p_row = db.query(RecipientProfileORM).filter_by(user_id=user["id"]).first()
        assert p_row is not None
        assert p_row.daily_capacity_meals == 350
        assert p_row.max_travel_distance_km == 20.0
        assert "REFRIGERATED" in p_row.storage_types


def test_06_unauthorized_role_and_cross_user_profile_isolation():
    """7. Verify role-based access control and isolation between users."""
    donor = AuthService.register_user({
        "email": "donor_authz@foodsync.org",
        "password": "Password123!",
        "role": "FOOD_PROVIDER",
        "organization_name": "Bakery",
        "phone": "+91 98220 44444",
        "address": "123 Street",
        "latitude": 17.65,
        "longitude": 75.90,
    })
    donor_token = AuthService.create_token_for_user(donor)

    # Food provider is forbidden from accessing recipient profile
    get_res = client.get("/api/v1/recipients/profile", headers={"Authorization": f"Bearer {donor_token}"})
    assert get_res.status_code == 403

    put_res = client.put(
        "/api/v1/recipients/profile",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "org_type": "SHELTER",
            "daily_capacity_meals": 100,
            "storage_types": ["DRY"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 15.0,
        },
    )
    assert put_res.status_code == 403


def test_07_persistence_across_backend_restart():
    """9. Verify all users and recipient profiles survive cache wipe and reload from PostgreSQL."""
    u1 = AuthService.register_user({
        "email": "restart_donor@foodsync.org",
        "password": "Password123!",
        "role": "FOOD_PROVIDER",
        "organization_name": "Restart Bakery",
        "phone": "+91 98220 55555",
        "address": "Restart Lane",
        "latitude": 17.65,
        "longitude": 75.90,
    })
    u2 = AuthService.register_user({
        "email": "restart_recipient@foodsync.org",
        "password": "Password123!",
        "role": "RECIPIENT",
        "organization_name": "Restart Shelter",
        "phone": "+91 98220 66666",
        "address": "Restart Ave",
        "latitude": 17.66,
        "longitude": 75.91,
    })

    # Simulate restart
    reloaded_store = InMemoryStore()
    assert u1["id"] in reloaded_store.users
    assert u2["id"] in reloaded_store.users
    assert u2["id"] in reloaded_store.recipient_profiles
    assert reloaded_store.users[u1["id"]]["email"] == "restart_donor@foodsync.org"
