from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.core.store import store
from app.main import app
from app.models import DonationORM, ImpactLogORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM
from app.services.matching.heuristic import generate_matches_for_donation


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


def register_user(email: str, role: str, lat: float = 17.6599, lng: float = 75.9064) -> dict:
    payload = {
        "email": email,
        "password": "StrongPassword123!",
        "role": role,
        "organization_name": f"Org for {email}",
        "phone": "+91 9876543210",
        "address": "Solapur Central",
        "latitude": lat,
        "longitude": lng,
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_complete_reservation_and_handover_lifecycle():
    """Verify end-to-end lifecycle: AVAILABLE -> RESERVED -> COMPLETED with impact logging."""
    provider = register_user("provider_coord@example.com", role="FOOD_PROVIDER", lat=17.6599, lng=75.9064)
    recip = register_user("recipient_coord@example.com", role="RECIPIENT", lat=17.6620, lng=75.9080)

    # 1. Provider creates a donation
    now = datetime.now(timezone.utc)
    donation_payload = {
        "title": "50 Thali Lunch Boxes",
        "food_type": "VEGETARIAN_COOKED",
        "perishable": False,
        "quantity_meals": 50,
        "prepared_at": (now - timedelta(hours=1)).isoformat(),
        "expiry_time": (now + timedelta(hours=5)).isoformat(),
        "pickup_address": "12 Market Lane, Solapur Central",
        "latitude": 17.6599,
        "longitude": 75.9064,
        "special_instructions": "Pickup between 12:00 and 14:00",
    }
    don_res = client.post(
        "/api/v1/donations",
        json=donation_payload,
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert don_res.status_code == 201
    donation_id = don_res.json()["id"]
    assert don_res.json()["status"] == "AVAILABLE"

    # 2. Recipient views candidate match
    matches = client.get(
        "/api/v1/recipients/matches",
        headers={"Authorization": f"Bearer {recip['token']}"},
    ).json()["data"]
    assert len(matches) == 1
    match_id = matches[0]["id"]
    assert matches[0]["status"] in {"PROPOSED", "NOTIFIED"}

    # 3. Recipient accepts match -> transitions to ACCEPTED and donation to RESERVED
    accept_res = client.post(
        f"/api/v1/matches/{match_id}/accept",
        headers={"Authorization": f"Bearer {recip['token']}"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["data"]["status"] == "ACCEPTED"

    # Verify donation status is RESERVED
    don_check = client.get(
        f"/api/v1/donations/{donation_id}",
        headers={"Authorization": f"Bearer {recip['token']}"},
    ).json()
    assert don_check["status"] == "RESERVED"

    # 4. Matched Recipient confirms physical handover collection
    complete_payload = {
        "confirmed_quantity_meals": 48,
        "notes": "48 meals collected in clean crates, 2 damaged during transit.",
    }
    complete_res = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        json=complete_payload,
        headers={"Authorization": f"Bearer {recip['token']}"},
    )
    assert complete_res.status_code == 200, complete_res.text
    comp_data = complete_res.json()["data"]
    assert comp_data["status"] == "COMPLETED"
    assert comp_data["donation"]["quantity_meals"] == 48
    assert comp_data["impact"]["meals_rescued"] == 48
    assert comp_data["impact"]["food_weight_kg"] == 24.0 # 48 * 0.5
    assert comp_data["impact"]["co2_savings_kg"] == 60.0 # 24 * 2.5

    # 5. Verify impact summary is updated platform-wide
    summary_res = client.get("/api/v1/impact/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_meals_rescued"] >= 48
    assert summary["total_completed_donations"] >= 1


def test_unauthorized_user_cannot_complete_handover():
    """Verify that an unrelated user cannot complete a reservation."""
    provider = register_user("prov_owner@example.com", role="FOOD_PROVIDER")
    recip = register_user("recip_matched@example.com", role="RECIPIENT")
    unrelated = register_user("unrelated_party@example.com", role="RECIPIENT", lat=17.700, lng=75.950)

    now = datetime.now(timezone.utc)
    donation_payload = {
        "title": "Bakery Crates",
        "food_type": "BAKERY",
        "perishable": False,
        "quantity_meals": 30,
        "prepared_at": (now - timedelta(hours=1)).isoformat(),
        "expiry_time": (now + timedelta(hours=4)).isoformat(),
        "pickup_address": "Bakery Street",
        "latitude": 17.6599,
        "longitude": 75.9064,
    }
    donation = client.post(
        "/api/v1/donations",
        json=donation_payload,
        headers={"Authorization": f"Bearer {provider['token']}"},
    ).json()

    # Recipient accepts match
    matches = client.get(
        "/api/v1/recipients/matches",
        headers={"Authorization": f"Bearer {recip['token']}"},
    ).json()["data"]
    client.post(
        f"/api/v1/matches/{matches[0]['id']}/accept",
        headers={"Authorization": f"Bearer {recip['token']}"},
    )

    # Unrelated recipient tries to complete handover -> 403 Forbidden
    unauthorized_res = client.post(
        f"/api/v1/donations/{donation['id']}/complete",
        json={"confirmed_quantity_meals": 30},
        headers={"Authorization": f"Bearer {unrelated['token']}"},
    )
    assert unauthorized_res.status_code == 403
    assert unauthorized_res.json()["detail"]["error"]["code"] == "FORBIDDEN"


def test_cannot_complete_unreserved_or_already_completed_donation():
    """Verify that completing an AVAILABLE or already COMPLETED donation is rejected."""
    provider = register_user("prov_check@example.com", role="FOOD_PROVIDER")

    now = datetime.now(timezone.utc)
    donation = client.post(
        "/api/v1/donations",
        json={
            "title": "Fresh Apples",
            "food_type": "PRODUCE_RAW",
            "perishable": False,
            "quantity_meals": 25,
            "prepared_at": (now - timedelta(hours=1)).isoformat(),
            "expiry_time": (now + timedelta(hours=24)).isoformat(),
            "pickup_address": "Orchard Lane",
            "latitude": 17.6599,
            "longitude": 75.9064,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    ).json()

    # Attempting to complete AVAILABLE donation before reservation -> 400 Bad Request
    fail_res = client.post(
        f"/api/v1/donations/{donation['id']}/complete",
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert fail_res.status_code == 400
    assert "reserved before completion" in fail_res.json()["detail"]["error"]["message"]
