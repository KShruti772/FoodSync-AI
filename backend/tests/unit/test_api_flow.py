from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.store import store
from app.main import app


@pytest.fixture(autouse=True)
def reset_store():
    store.users.clear()
    store.donor_profiles.clear()
    store.recipient_profiles.clear()
    store.donations.clear()
    store.matches.clear()
    store.notifications.clear()
    store.impact_logs.clear()
    yield
    store.users.clear()
    store.donor_profiles.clear()
    store.recipient_profiles.clear()
    store.donations.clear()
    store.matches.clear()
    store.notifications.clear()
    store.impact_logs.clear()


client = TestClient(app)


def register_user(
    email: str,
    role: str = "FOOD_PROVIDER",
    latitude: float = 12.9716,
    longitude: float = 77.5946,
) -> dict:
    payload = {
        "email": email,
        "password": "StrongPass123",
        "role": role,
        "organization_name": "Sample Org",
        "phone": "9876543210",
        "address": "123 Main Street",
        "latitude": latitude,
        "longitude": longitude,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_and_login_flow():
    created = register_user("provider@example.com", role="FOOD_PROVIDER")
    token = created["token"]
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "provider@example.com"
    assert me.json()["phone"] == "9876543210"
    assert me.json()["address"] == "123 Main Street"

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "provider@example.com", "password": "StrongPass123"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "FOOD_PROVIDER"


def test_donation_match_and_reservation_flow():
    provider = register_user("provider@example.com", role="FOOD_PROVIDER")
    recipient = register_user("recipient@example.com", role="RECIPIENT")

    provider_token = provider["token"]
    recipient_token = recipient["token"]

    profile_response = client.get(
        "/api/v1/recipients/profile",
        headers={"Authorization": f"Bearer {recipient_token}"},
    )
    assert profile_response.status_code == 200, profile_response.text

    donation_payload = {
        "title": "Rice packets",
        "food_type": "PACKAGED_GROCERY",
        "perishable": False,
        "quantity_meals": 40,
        "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "pickup_address": "123 Market Road",
        "latitude": 12.9716,
        "longitude": 77.5946,
    }
    donation_response = client.post(
        "/api/v1/donations",
        json=donation_payload,
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert donation_response.status_code == 201, donation_response.text
    donation_id = donation_response.json()["id"]
    assert donation_response.json()["status"] == "AVAILABLE"

    matches_response = client.get(
        "/api/v1/recipients/matches",
        headers={"Authorization": f"Bearer {recipient_token}"},
    )
    assert matches_response.status_code == 200, matches_response.text
    match_data = matches_response.json()["data"]
    assert len(match_data) >= 1

    match_id = match_data[0]["id"]
    accept_response = client.post(
        f"/api/v1/matches/{match_id}/accept",
        headers={"Authorization": f"Bearer {recipient_token}"},
    )
    assert accept_response.status_code == 200, accept_response.text
    assert accept_response.json()["data"]["status"] == "ACCEPTED"

    donation_status = client.get(
        f"/api/v1/donations/{donation_id}",
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert donation_status.status_code == 200
    assert donation_status.json()["status"] == "RESERVED"


def test_impact_summary_endpoint():
    provider = register_user("provider@example.com", role="FOOD_PROVIDER")
    recipient = register_user("recipient@example.com", role="RECIPIENT")

    client.get(
        "/api/v1/recipients/profile",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    donation = client.post(
        "/api/v1/donations",
        json={
            "title": "Fresh produce",
            "food_type": "PRODUCE_RAW",
            "perishable": True,
            "quantity_meals": 20,
            "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "pickup_address": "456 Green Lane",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert donation.status_code == 201

    summary = client.get("/api/v1/impact/summary")
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["total_completed_donations"] >= 0
    assert payload["total_meals_rescued"] >= 0


def test_new_recipient_profile_and_matches_use_signup_location_and_expiry_urgency():
    provider = register_user("provider@example.com", role="FOOD_PROVIDER")
    near_recipient = register_user("near@example.com", role="RECIPIENT", latitude=12.9720, longitude=77.5950)
    far_recipient = register_user("far@example.com", role="RECIPIENT", latitude=12.9900, longitude=77.5900)

    near_user = store.users[near_recipient["user"]["id"]]
    far_user = store.users[far_recipient["user"]["id"]]

    assert near_user["id"] in store.recipient_profiles
    assert far_user["id"] in store.recipient_profiles

    donation_response = client.post(
        "/api/v1/donations",
        json={
            "title": "Urgent meal packs",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 30,
            "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "pickup_address": "123 Market Road",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert donation_response.status_code == 201, donation_response.text

    matches_response = client.get(
        f"/api/v1/donations/{donation_response.json()['id']}/matches",
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert matches_response.status_code == 200, matches_response.text
    matches = matches_response.json()
    assert [match["recipient_id"] for match in matches] == [near_user["id"], far_user["id"]]
    assert all(match["matched_factors"]["urgency_score"] == 1.0 for match in matches)
