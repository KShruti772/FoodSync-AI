from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.core.store import store
from app.main import app
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
        db.query(ImpactLogORM).delete()
        db.query(NotificationORM).delete()
        db.query(MatchORM).delete()
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
        db.query(ImpactLogORM).delete()
        db.query(NotificationORM).delete()
        db.query(MatchORM).delete()
        db.query(DonationORM).delete()
        db.query(RecipientProfileORM).delete()
        db.query(UserORM).delete()
        db.commit()



client = TestClient(app)


def register_user(email: str, role: str = "FOOD_PROVIDER") -> dict:
    payload = {
        "email": email,
        "password": "StrongPass123",
        "role": role,
        "organization_name": "Sample Org",
        "phone": "9876543210",
        "address": "123 Main Street",
        "latitude": 12.9716,
        "longitude": 77.5946,
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

    now = datetime.now(timezone.utc)
    donation_payload = {
        "title": "Rice packets",
        "food_type": "PACKAGED_GROCERY",
        "perishable": False,
        "quantity_meals": 40,
        "prepared_at": (now - timedelta(hours=1)).isoformat(),
        "expiry_time": (now + timedelta(hours=6)).isoformat(),
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

    # Step 5: Unauthorized third-party cannot complete the donation
    unauthorized = register_user("unauth@example.com", role="FOOD_PROVIDER")
    unauth_complete = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {unauthorized['token']}"},
    )
    assert unauth_complete.status_code == 403, unauth_complete.text

    # Step 6: Provider completes handover, triggering immutable impact logging
    complete_response = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {provider_token}"},
        json={"notes": "All picked up smoothly and safely distributed"},
    )
    assert complete_response.status_code == 200, complete_response.text
    completed_data = complete_response.json()["data"]
    assert completed_data["status"] == "COMPLETED"
    assert completed_data["impact"]["meals_rescued"] == 40
    assert completed_data["impact"]["food_weight_kg"] == 20.0
    assert completed_data["impact"]["co2_savings_kg"] == 50.0

    # Step 7: Completed donation cannot be cancelled
    cancel_after_complete = client.post(
        f"/api/v1/donations/{donation_id}/cancel",
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert cancel_after_complete.status_code == 400

    # Step 8: Both provider and recipient received completion notifications
    prov_notifs = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {provider_token}"},
    )
    assert prov_notifs.status_code == 200
    assert any(n["type"] == "SYSTEM" for n in prov_notifs.json())

    recip_notifs = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {recipient_token}"},
    )
    assert recip_notifs.status_code == 200
    assert any(n["type"] == "SYSTEM" for n in recip_notifs.json())


def test_impact_summary_endpoint():
    provider = register_user("provider_impact@example.com", role="FOOD_PROVIDER")
    recipient = register_user("recipient_impact@example.com", role="RECIPIENT")

    now = datetime.now(timezone.utc)
    donation_response = client.post(
        "/api/v1/donations",
        json={
            "title": "Canned beans and rice",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 30,
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "expiry_time": (now + timedelta(hours=5)).isoformat(),
            "pickup_address": "456 Green Lane",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert donation_response.status_code == 201
    donation_id = donation_response.json()["id"]

    # Match, accept, and complete donation to generate impact
    matches_res = client.get(
        "/api/v1/recipients/matches",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert matches_res.status_code == 200
    match_id = matches_res.json()["data"][0]["id"]

    accept_res = client.post(
        f"/api/v1/matches/{match_id}/accept",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert accept_res.status_code == 200

    complete_res = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert complete_res.status_code == 200

    summary = client.get("/api/v1/impact/summary")
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["total_completed_donations"] >= 1
    assert payload["total_meals_rescued"] >= 30
    assert payload["total_food_weight_kg"] >= 15.0
    assert payload["total_co2_savings_kg"] >= 37.5


def test_cancel_donation_lifecycle():
    provider = register_user("provider_cancel@example.com", role="FOOD_PROVIDER")
    other_provider = register_user("provider_other@example.com", role="FOOD_PROVIDER")

    now = datetime.now(timezone.utc)
    donation_response = client.post(
        "/api/v1/donations",
        json={
            "title": "Surplus baked goods",
            "food_type": "BAKERY",
            "perishable": False,
            "quantity_meals": 25,
            "prepared_at": (now - timedelta(hours=2)).isoformat(),
            "expiry_time": (now + timedelta(hours=8)).isoformat(),
            "pickup_address": "789 Bakery Street",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert donation_response.status_code == 201
    donation_id = donation_response.json()["id"]

    # Other provider cannot cancel
    unauth_cancel = client.post(
        f"/api/v1/donations/{donation_id}/cancel",
        headers={"Authorization": f"Bearer {other_provider['token']}"},
    )
    assert unauth_cancel.status_code == 403

    # Owner cancels successfully
    cancel_res = client.post(
        f"/api/v1/donations/{donation_id}/cancel",
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["data"]["status"] == "CANCELLED"

    # Cannot cancel already cancelled donation
    repeat_cancel = client.post(
        f"/api/v1/donations/{donation_id}/cancel",
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert repeat_cancel.status_code == 400


def test_match_rejection_and_next_candidate_reallocation():
    provider = register_user("provider_rej@example.com", role="FOOD_PROVIDER")
    recipient1 = register_user("recip1@example.com", role="RECIPIENT")
    recipient2 = register_user("recip2@example.com", role="RECIPIENT")

    now = datetime.now(timezone.utc)
    donation_response = client.post(
        "/api/v1/donations",
        json={
            "title": "Cooked meals batch",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 50,
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "expiry_time": (now + timedelta(hours=4)).isoformat(),
            "pickup_address": "100 Community Hall",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert donation_response.status_code == 201

    # Candidate 1 rejects match
    m1_res = client.get(
        "/api/v1/recipients/matches",
        headers={"Authorization": f"Bearer {recipient1['token']}"},
    )
    assert m1_res.status_code == 200
    m1_matches = m1_res.json()["data"]
    assert len(m1_matches) >= 1
    m1_id = m1_matches[0]["id"]

    reject_res = client.post(
        f"/api/v1/matches/{m1_id}/reject",
        headers={"Authorization": f"Bearer {recipient1['token']}"},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["data"]["status"] == "REJECTED"

    # Candidate 2 received reallocation notification
    m2_notifs = client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {recipient2['token']}"},
    )
    assert m2_notifs.status_code == 200
    assert any(n["type"] == "MATCH_ALERT" for n in m2_notifs.json())
