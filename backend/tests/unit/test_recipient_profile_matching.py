from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.store import store
from app.main import app
from app.services.matching.heuristic import generate_matches_for_donation


from app.core.database import SessionLocal
from app.models import DonationORM, ImpactLogORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM


@pytest.fixture(autouse=True)
def reset_store():
    store.users.clear()
    store.donor_profiles.clear()
    store.recipient_profiles.clear()
    store.donations.clear()
    store.matches.clear()
    store.notifications.clear()
    store.impact_logs.clear()
    with SessionLocal() as db:
        db.query(MatchORM).delete()
        db.query(NotificationORM).delete()
        db.query(ImpactLogORM).delete()
        db.query(DonationORM).delete()
        db.query(RecipientProfileORM).delete()
        db.query(UserORM).delete()
        db.commit()
    yield
    store.users.clear()
    store.donor_profiles.clear()
    store.recipient_profiles.clear()
    store.donations.clear()
    store.matches.clear()
    store.notifications.clear()
    store.impact_logs.clear()
    with SessionLocal() as db:
        db.query(MatchORM).delete()
        db.query(NotificationORM).delete()
        db.query(ImpactLogORM).delete()
        db.query(DonationORM).delete()
        db.query(RecipientProfileORM).delete()
        db.query(UserORM).delete()
        db.commit()


client = TestClient(app)


def register_user(email: str, role: str = "RECIPIENT", lat: float = 17.6599, lng: float = 75.9064) -> dict:
    payload = {
        "email": email,
        "password": "StrongPass123!",
        "role": role,
        "organization_name": f"Org for {email}",
        "phone": "9876543210",
        "address": "Solapur Area",
        "latitude": lat,
        "longitude": lng,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_recipient_profile_initialization_and_access():
    """Verify default recipient profile initialization and role enforcement."""
    recip = register_user("shelter_init@example.com", role="RECIPIENT")
    token = recip["token"]

    # Recipient can fetch their own profile
    res = client.get("/api/v1/recipients/profile", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200, res.text
    profile = res.json()
    assert profile["user_id"] == recip["user"]["id"]
    assert profile["org_type"] == "SHELTER"
    assert profile["daily_capacity_meals"] == 100
    assert profile["storage_types"] == ["DRY"]
    assert profile["dietary_preferences"] == "ALL"
    assert profile["max_travel_distance_km"] == 15.0


def test_unauthorized_food_provider_cannot_access_or_edit_recipient_profile():
    """Verify food providers receive 403 Forbidden when trying to access or edit recipient profile."""
    provider = register_user("provider_forbidden@example.com", role="FOOD_PROVIDER")
    token = provider["token"]

    # GET forbidden
    get_res = client.get("/api/v1/recipients/profile", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 403
    assert get_res.json()["detail"]["error"]["code"] == "FORBIDDEN"

    # PUT forbidden
    put_payload = {
        "org_type": "FOOD_BANK",
        "daily_capacity_meals": 120,
        "storage_types": ["DRY", "REFRIGERATED"],
        "dietary_preferences": "ALL",
        "max_travel_distance_km": 10.0,
        "operating_hours": "09:00 - 17:00",
    }
    put_res = client.put(
        "/api/v1/recipients/profile",
        json=put_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_res.status_code == 403
    assert put_res.json()["detail"]["error"]["code"] == "FORBIDDEN"


def test_recipient_profile_update_and_persistence():
    """Verify updating intake settings persists to the authoritative server store."""
    recip = register_user("shelter_persist@example.com", role="RECIPIENT")
    token = recip["token"]

    update_payload = {
        "org_type": "COMMUNITY_KITCHEN",
        "daily_capacity_meals": 250,
        "storage_types": ["DRY", "REFRIGERATED", "FROZEN"],
        "dietary_preferences": "VEGETARIAN_ONLY",
        "max_travel_distance_km": 8.5,
        "operating_hours": "07:00 - 21:00",
    }

    put_res = client.put(
        "/api/v1/recipients/profile",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert put_res.status_code == 200, put_res.text
    updated = put_res.json()
    assert updated["org_type"] == "COMMUNITY_KITCHEN"
    assert updated["daily_capacity_meals"] == 250
    assert set(updated["storage_types"]) == {"DRY", "REFRIGERATED", "FROZEN"}
    assert updated["dietary_preferences"] == "VEGETARIAN_ONLY"
    assert updated["max_travel_distance_km"] == 8.5
    assert updated["operating_hours"] == "07:00 - 21:00"

    # Reload via GET to verify persistence
    get_res = client.get("/api/v1/recipients/profile", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 200
    persisted = get_res.json()
    assert persisted["daily_capacity_meals"] == 250
    assert persisted["max_travel_distance_km"] == 8.5
    assert persisted["dietary_preferences"] == "VEGETARIAN_ONLY"
    assert set(persisted["storage_types"]) == {"DRY", "REFRIGERATED", "FROZEN"}


def test_recipient_profile_validation_failures():
    """Verify schema boundary validations (negative capacity, distance <= 0)."""
    recip = register_user("shelter_val@example.com", role="RECIPIENT")
    token = recip["token"]

    # Negative daily capacity
    bad_capacity = {
        "org_type": "SHELTER",
        "daily_capacity_meals": -10,
        "storage_types": ["DRY"],
        "dietary_preferences": "ALL",
        "max_travel_distance_km": 10.0,
    }
    res1 = client.put("/api/v1/recipients/profile", json=bad_capacity, headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 422

    # Zero or negative travel distance (Field requires gt=0.0)
    bad_distance = {
        "org_type": "SHELTER",
        "daily_capacity_meals": 100,
        "storage_types": ["DRY"],
        "dietary_preferences": "ALL",
        "max_travel_distance_km": 0.0,
    }
    res2 = client.put("/api/v1/recipients/profile", json=bad_distance, headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 422

    # Invalid enum
    bad_dietary = {
        "org_type": "SHELTER",
        "daily_capacity_meals": 100,
        "storage_types": ["DRY"],
        "dietary_preferences": "INVALID_DIET",
        "max_travel_distance_km": 10.0,
    }
    res3 = client.put("/api/v1/recipients/profile", json=bad_dietary, headers={"Authorization": f"Bearer {token}"})
    assert res3.status_code == 422


def test_matching_cold_storage_requirement_influences_eligibility():
    """Verify that updating storage_types from DRY to REFRIGERATED enables matching perishable food."""
    provider = register_user("donor_cold@example.com", role="FOOD_PROVIDER", lat=17.6599, lng=75.9064)
    recip = register_user("recip_cold@example.com", role="RECIPIENT", lat=17.6620, lng=75.9080)

    # 1. Recipient defaults to DRY storage only
    recip_profile = client.get("/api/v1/recipients/profile", headers={"Authorization": f"Bearer {recip['token']}"}).json()
    assert recip_profile["storage_types"] == ["DRY"]

    # 2. Provider creates a perishable cooked meal donation
    now = datetime.now(timezone.utc)
    donation_payload = {
        "title": "Perishable Dal and Rice",
        "food_type": "VEGETARIAN_COOKED",
        "quantity_meals": 30,
        "prepared_at": (now - timedelta(hours=1)).isoformat(),
        "expiry_time": (now + timedelta(hours=4)).isoformat(),
        "pickup_address": "Solapur Kitchen",
        "latitude": 17.6599,
        "longitude": 75.9064,
        "special_instructions": "Keep refrigerated",
        "perishable": True,
    }
    don_res = client.post("/api/v1/donations", json=donation_payload, headers={"Authorization": f"Bearer {provider['token']}"})
    assert don_res.status_code == 201, don_res.text
    donation_id = don_res.json()["id"]

    # 3. Matching engine rejects recipient because of missing cold storage
    matches = generate_matches_for_donation(donation_id)
    assert len(matches) == 0, "Recipient with only DRY storage must not match perishable food"

    # 4. Recipient upgrades profile to include REFRIGERATED storage
    update_res = client.put(
        "/api/v1/recipients/profile",
        json={
            "org_type": "SHELTER",
            "daily_capacity_meals": 100,
            "storage_types": ["DRY", "REFRIGERATED"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 15.0,
        },
        headers={"Authorization": f"Bearer {recip['token']}"},
    )
    assert update_res.status_code == 200

    # 5. Re-evaluate matching: Recipient is now qualified and matched!
    matches_after = generate_matches_for_donation(donation_id)
    assert len(matches_after) == 1
    assert matches_after[0]["recipient_id"] == recip["user"]["id"]
    assert matches_after[0]["compatibility_score"] > 0.0


def test_matching_dietary_preference_influences_eligibility():
    """Verify that updating dietary_preferences to VEGETARIAN_ONLY disqualifies non-veg food."""
    provider = register_user("donor_diet@example.com", role="FOOD_PROVIDER", lat=17.6599, lng=75.9064)
    recip = register_user("recip_diet@example.com", role="RECIPIENT", lat=17.6620, lng=75.9080)

    # 1. Update recipient to have cold storage and accept ALL food
    client.put(
        "/api/v1/recipients/profile",
        json={
            "org_type": "SHELTER",
            "daily_capacity_meals": 100,
            "storage_types": ["DRY", "REFRIGERATED"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 15.0,
        },
        headers={"Authorization": f"Bearer {recip['token']}"},
    )

    # 2. Provider creates non-vegetarian donation
    now = datetime.now(timezone.utc)
    donation_payload = {
        "title": "Non-Veg Chicken Curry",
        "food_type": "NON_VEGETARIAN_COOKED",
        "quantity_meals": 40,
        "prepared_at": (now - timedelta(hours=1)).isoformat(),
        "expiry_time": (now + timedelta(hours=3)).isoformat(),
        "pickup_address": "Solapur Kitchen",
        "latitude": 17.6599,
        "longitude": 75.9064,
        "perishable": True,
    }
    don_res = client.post("/api/v1/donations", json=donation_payload, headers={"Authorization": f"Bearer {provider['token']}"})
    assert don_res.status_code == 201
    donation_id = don_res.json()["id"]

    # Recipient matches because dietary preference is ALL
    matches = generate_matches_for_donation(donation_id)
    assert len(matches) == 1

    # 3. Recipient updates preference to VEGETARIAN_ONLY
    client.put(
        "/api/v1/recipients/profile",
        json={
            "org_type": "SHELTER",
            "daily_capacity_meals": 100,
            "storage_types": ["DRY", "REFRIGERATED"],
            "dietary_preferences": "VEGETARIAN_ONLY",
            "max_travel_distance_km": 15.0,
        },
        headers={"Authorization": f"Bearer {recip['token']}"},
    )

    # 4. Re-evaluate matching: non-vegetarian donation is now disqualified!
    matches_after = generate_matches_for_donation(donation_id)
    assert len(matches_after) == 0, "VEGETARIAN_ONLY recipient must not match NON_VEGETARIAN_COOKED food"


def test_matching_travel_distance_limit_influences_eligibility():
    """Verify that recipient travel distance limits disqualify candidates beyond their radius."""
    # Place provider and recipient ~5.5 km apart in Solapur
    provider = register_user("donor_dist@example.com", role="FOOD_PROVIDER", lat=17.6599, lng=75.9064)
    recip = register_user("recip_dist@example.com", role="RECIPIENT", lat=17.7000, lng=75.9300)

    now = datetime.now(timezone.utc)
    donation_payload = {
        "title": "Fresh Bread and Pastries",
        "food_type": "BAKERY",
        "quantity_meals": 20,
        "prepared_at": (now - timedelta(hours=1)).isoformat(),
        "expiry_time": (now + timedelta(hours=6)).isoformat(),
        "pickup_address": "Bakery",
        "latitude": 17.6599,
        "longitude": 75.9064,
        "perishable": False,
    }
    don_res = client.post("/api/v1/donations", json=donation_payload, headers={"Authorization": f"Bearer {provider['token']}"})
    assert don_res.status_code == 201
    donation_id = don_res.json()["id"]

    # 1. Set travel distance to 2.0 km (recipient cannot reach 5.5 km away)
    client.put(
        "/api/v1/recipients/profile",
        json={
            "org_type": "SHELTER",
            "daily_capacity_meals": 100,
            "storage_types": ["DRY"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 2.0,
        },
        headers={"Authorization": f"Bearer {recip['token']}"},
    )

    matches_tight = generate_matches_for_donation(donation_id)
    assert len(matches_tight) == 0, "Candidate exceeds recipient 2.0 km limit"

    # 2. Expand travel distance to 10.0 km
    client.put(
        "/api/v1/recipients/profile",
        json={
            "org_type": "SHELTER",
            "daily_capacity_meals": 100,
            "storage_types": ["DRY"],
            "dietary_preferences": "ALL",
            "max_travel_distance_km": 10.0,
        },
        headers={"Authorization": f"Bearer {recip['token']}"},
    )

    matches_wide = generate_matches_for_donation(donation_id)
    assert len(matches_wide) == 1, "Candidate is within recipient 10.0 km limit"
