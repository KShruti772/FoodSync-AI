from __future__ import annotations

from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.core.database import SessionLocal
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
from app.services.reservation_service import ReservationService


@pytest.fixture(autouse=True)
def reset_store():
    with SessionLocal() as db:
        for model in (
            ImpactLogORM,
            NotificationORM,
            MatchORM,
            DonationORM,
            RecipientProfileORM,
            UserORM,
        ):
            db.query(model).delete()
        db.commit()
    store.users.clear()
    store.donor_profiles.clear()
    store.recipient_profiles.clear()
    store.donations.clear()
    store.matches.clear()
    store.notifications.clear()
    store.impact_logs.clear()
    store.refresh_from_db()
    yield
    with SessionLocal() as db:
        for model in (
            ImpactLogORM,
            NotificationORM,
            MatchORM,
            DonationORM,
            RecipientProfileORM,
            UserORM,
        ):
            db.query(model).delete()
        db.commit()
    store.users.clear()
    store.donor_profiles.clear()
    store.recipient_profiles.clear()
    store.donations.clear()
    store.matches.clear()
    store.notifications.clear()
    store.impact_logs.clear()
    store.refresh_from_db()


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
    store.users.clear()
    store.refresh_from_db()
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
    assert donation_status.json()["reserved_recipient_id"] == recipient["user"]["id"]
    deadline = datetime.fromisoformat(donation_status.json()["reservation_deadline"])
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    assert deadline > datetime.now(timezone.utc)


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


def test_recipient_feed_includes_unmatched_available_donations_without_accept_action():
    provider = register_user("provider@example.com")
    recipient = register_user("recipient@example.com", role="RECIPIENT")
    donation = client.post(
        "/api/v1/donations",
        json={
            "title": "Distant food packs",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 30,
            "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "pickup_address": "123 Private Market Road",
            "latitude": 20.0,
            "longitude": 20.0,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert donation.status_code == 201
    donation_id = donation.json()["id"]

    feed = client.get(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert feed.status_code == 200, feed.text
    assert any(item["id"] == donation_id for item in feed.json())
    listed = next(item for item in feed.json() if item["id"] == donation_id)
    assert listed["status"] == "AVAILABLE"
    assert listed["pickup_address"] is None
    assert listed["latitude"] is None

    matches = client.get(
        "/api/v1/recipients/matches",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert matches.status_code == 200
    assert all(item["donation_id"] != donation_id for item in matches.json()["data"])
    acceptance = client.post(
        "/api/v1/matches/not-a-compatible-match/accept",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert acceptance.status_code == 400


def test_expired_reservation_is_released_and_another_recipient_can_accept():
    provider = register_user("provider@example.com")
    first_recipient = register_user("first@example.com", role="RECIPIENT")
    second_recipient = register_user("second@example.com", role="RECIPIENT")
    created = client.post(
        "/api/v1/donations",
        json={
            "title": "Redistributable meal packs",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 30,
            "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "pickup_address": "123 Market Road",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    donation_id = created.json()["id"]
    first_matches = client.get(
        "/api/v1/recipients/matches",
        headers={"Authorization": f"Bearer {first_recipient['token']}"},
    ).json()["data"]
    first_match = next(item for item in first_matches if item["donation_id"] == donation_id)
    accepted = client.post(
        f"/api/v1/matches/{first_match['id']}/accept",
        headers={"Authorization": f"Bearer {first_recipient['token']}"},
    )
    assert accepted.status_code == 200, accepted.text

    with SessionLocal() as db:
        match = db.get(MatchORM, first_match["id"])
        donation = db.get(DonationORM, donation_id)
        match.pickup_deadline = datetime.now(timezone.utc) - timedelta(seconds=1)
        donation.reservation_deadline = match.pickup_deadline
        db.commit()

    assert ReservationService.release_expired_reservations() == 1
    store.refresh_from_db()
    assert store.donations[donation_id]["status"] == "AVAILABLE"
    assert store.matches[first_match["id"]]["status"] == "EXPIRED"
    assert store.matches[first_match["id"]]["reservation_outcome"] == "TIMED_OUT"
    for user in (provider, first_recipient):
        notifications = client.get(
            "/api/v1/notifications",
            headers={"Authorization": f"Bearer {user['token']}"},
        )
        assert notifications.status_code == 200
        assert any(
            item["type"] == "RESERVATION_EXPIRED"
            for item in notifications.json()
        )

    second_matches = client.get(
        "/api/v1/recipients/matches",
        headers={"Authorization": f"Bearer {second_recipient['token']}"},
    ).json()["data"]
    second_match = next(item for item in second_matches if item["donation_id"] == donation_id)
    second_accept = client.post(
        f"/api/v1/matches/{second_match['id']}/accept",
        headers={"Authorization": f"Bearer {second_recipient['token']}"},
    )
    assert second_accept.status_code == 200, second_accept.text
    assert second_accept.json()["data"]["pickup_deadline"] is not None

    original_completion = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {first_recipient['token']}"},
    )
    assert original_completion.status_code == 400
    current = client.get(
        f"/api/v1/donations/{donation_id}",
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    assert current.json()["reserved_recipient_id"] == second_recipient["user"]["id"]


def test_completed_donation_is_not_released_after_old_deadline():
    provider = register_user("provider@example.com")
    recipient = register_user("recipient@example.com", role="RECIPIENT")
    created = client.post(
        "/api/v1/donations",
        json={
            "title": "Collected pantry food",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 20,
            "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "pickup_address": "456 Market Road",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    donation_id = created.json()["id"]
    candidate = next(
        item
        for item in client.get(
            "/api/v1/recipients/matches",
            headers={"Authorization": f"Bearer {recipient['token']}"},
        ).json()["data"]
        if item["donation_id"] == donation_id
    )
    accepted = client.post(
        f"/api/v1/matches/{candidate['id']}/accept",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert accepted.status_code == 200
    completed = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert completed.status_code == 200, completed.text

    with SessionLocal() as db:
        match = db.get(MatchORM, candidate["id"])
        match.pickup_deadline = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert ReservationService.release_expired_reservations() == 0
    store.refresh_from_db()
    assert store.donations[donation_id]["status"] == "COMPLETED"
    assert store.matches[candidate["id"]]["status"] == "COMPLETED"
    impact = client.get("/api/v1/impact/summary")
    assert impact.status_code == 200
    assert impact.json()["total_meals_rescued"] == 20


def test_two_recipients_cannot_reserve_the_same_donation():
    provider = register_user("provider@example.com")
    recipients = [
        register_user("first@example.com", role="RECIPIENT"),
        register_user("second@example.com", role="RECIPIENT"),
    ]
    created = client.post(
        "/api/v1/donations",
        json={
            "title": "Single reservation batch",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 20,
            "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "pickup_address": "789 Market Road",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    donation_id = created.json()["id"]
    match_by_recipient = {}
    for recipient in recipients:
        match_by_recipient[recipient["user"]["id"]] = next(
            item
            for item in client.get(
                "/api/v1/recipients/matches",
                headers={"Authorization": f"Bearer {recipient['token']}"},
            ).json()["data"]
            if item["donation_id"] == donation_id
        )

    def accept(recipient):
        match = match_by_recipient[recipient["user"]["id"]]
        return client.post(
            f"/api/v1/matches/{match['id']}/accept",
            headers={"Authorization": f"Bearer {recipient['token']}"},
        )

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(accept, recipients))

    assert sorted(response.status_code for response in responses) == [200, 400]
    store.refresh_from_db()
    assert store.donations[donation_id]["status"] == "RESERVED"


def test_reserved_donation_returns_address_and_phone_of_its_own_provider():
    providers = [
        register_user("provider-one@example.com"),
        register_user("provider-two@example.com"),
    ]
    recipient = register_user("recipient@example.com", role="RECIPIENT")
    provider_details = [
        ("Provider One Registered Address", "+1-555-0101"),
        ("Provider Two Registered Address", "+1-555-0202"),
    ]
    donation_ids = []

    with SessionLocal() as db:
        for provider, (address, phone) in zip(providers, provider_details):
            user = db.get(UserORM, provider["user"]["id"])
            user.address = address
            user.phone = phone
        db.commit()
    store.refresh_from_db()

    for index, provider in enumerate(providers):
        created = client.post(
            "/api/v1/donations",
            json={
                "title": f"Provider {index + 1} surplus packs",
                "food_type": "PACKAGED_GROCERY",
                "perishable": False,
                "quantity_meals": 25,
                "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
                "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
                "pickup_address": f"{index + 1} Donation Pickup Road",
                "latitude": 12.9716,
                "longitude": 77.5946,
            },
            headers={"Authorization": f"Bearer {provider['token']}"},
        )
        assert created.status_code == 201, created.text
        donation_id = created.json()["id"]
        donation_ids.append(donation_id)
        recipient_matches = client.get(
            "/api/v1/recipients/matches",
            headers={"Authorization": f"Bearer {recipient['token']}"},
        ).json()["data"]
        match = next(item for item in recipient_matches if item["donation_id"] == donation_id)
        accepted = client.post(
            f"/api/v1/matches/{match['id']}/accept",
            headers={"Authorization": f"Bearer {recipient['token']}"},
        )
        assert accepted.status_code == 200, accepted.text

    for index, donation_id in enumerate(donation_ids):
        response = client.get(
            f"/api/v1/donations/{donation_id}",
            headers={"Authorization": f"Bearer {recipient['token']}"},
        )
        assert response.status_code == 200, response.text
        assert response.json()["provider_id"] == providers[index]["user"]["id"]
        assert response.json()["provider_address"] == provider_details[index][0]
        assert response.json()["provider_phone"] == provider_details[index][1]


def test_missing_provider_address_and_phone_are_returned_as_null():
    provider = register_user("provider-missing-details@example.com")
    recipient = register_user("recipient@example.com", role="RECIPIENT")
    with SessionLocal() as db:
        user = db.get(UserORM, provider["user"]["id"])
        user.address = None
        user.phone = None
        db.commit()
    store.refresh_from_db()

    created = client.post(
        "/api/v1/donations",
        json={
            "title": "Donation with incomplete provider profile",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 20,
            "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "pickup_address": "12 Pickup Avenue",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    donation_id = created.json()["id"]
    candidate = next(
        item
        for item in client.get(
            "/api/v1/recipients/matches",
            headers={"Authorization": f"Bearer {recipient['token']}"},
        ).json()["data"]
        if item["donation_id"] == donation_id
    )
    accepted = client.post(
        f"/api/v1/matches/{candidate['id']}/accept",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert accepted.status_code == 200

    response = client.get(
        f"/api/v1/donations/{donation_id}",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert response.status_code == 200
    assert response.json()["provider_address"] is None
    assert response.json()["provider_phone"] is None


def test_provider_contact_details_are_not_available_before_acceptance():
    provider = register_user("private-provider@example.com")
    recipient = register_user("private-recipient@example.com", role="RECIPIENT")
    created = client.post(
        "/api/v1/donations",
        json={
            "title": "Private provider contact test",
            "food_type": "PACKAGED_GROCERY",
            "perishable": False,
            "quantity_meals": 20,
            "prepared_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
            "expiry_time": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "pickup_address": "12 Pickup Avenue",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
        headers={"Authorization": f"Bearer {provider['token']}"},
    )
    response = client.get(
        f"/api/v1/donations/{created.json()['id']}",
        headers={"Authorization": f"Bearer {recipient['token']}"},
    )
    assert response.status_code == 403
