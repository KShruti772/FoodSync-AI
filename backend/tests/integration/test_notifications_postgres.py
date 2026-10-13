from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
import pytest

from app.core.database import SessionLocal, engine
from app.core.store import store
from app.main import app
from app.models import DonationORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM
from app.services.matching.heuristic import generate_matches_for_donation
from app.services.notification_service import NotificationService

client = TestClient(app)


@pytest.fixture(autouse=True)
def verify_postgres_engine():
    """Ensure tests run against a genuine PostgreSQL instance."""
    if engine.dialect.name != "postgresql":
        pytest.skip("Notification integration tests require active PostgreSQL engine")


def _unique_email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@foodsync.org"


def _register_provider(email: str, password: str = "SecurePassword123!") -> tuple[str, str]:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "role": "FOOD_PROVIDER",
            "organization_name": "Test Notif Bakery",
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
            "organization_name": "Test Notif Shelter",
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


def _create_donation(
    token: str,
    title: str = "Surplus Rice & Curry",
    food_type: str = "BAKERY",
    perishable: bool = False,
    quantity: int = 50,
) -> str:
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
            "pickup_address": "12 Station Road, Solapur",
            "latitude": 17.6599,
            "longitude": 75.9064,
            "special_instructions": "Handle with care",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

def test_01_create_notification_persists_in_postgres_and_retrievable_fresh_session():
    """Verify creating a notification persists directly to PostgreSQL and reads from a fresh session."""
    user_id, token = _register_provider(_unique_email("notif_create_1"))

    notif = NotificationService.create_notification(
        user_id=user_id,
        title="Welcome to FoodSync",
        message="Your food provider account is active.",
        type="SYSTEM",
    )
    assert notif["id"].startswith("notif_")
    assert notif["user_id"] == user_id
    assert notif["is_read"] is False

    # Clear memory cache completely
    store.notifications.clear()

    # Verify directly from fresh PostgreSQL session
    with SessionLocal() as db:
        row = db.get(NotificationORM, notif["id"])
        assert row is not None
        assert row.title == "Welcome to FoodSync"
        assert row.message == "Your food provider account is active."
        assert row.type == "SYSTEM"
        assert row.is_read is False

    # Verify via authenticated API endpoint
    res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    items = res.json()
    assert any(item["id"] == notif["id"] for item in items)


def test_02_notifications_scoped_strictly_to_intended_user():
    """Verify user isolation: User A never sees User B's notifications."""
    user_a_id, token_a = _register_provider(_unique_email("notif_scope_a"))
    user_b_id, token_b = _register_provider(_unique_email("notif_scope_b"))

    notif_a1 = NotificationService.create_notification(user_id=user_a_id, title="Alert A1", message="Msg A1")
    notif_a2 = NotificationService.create_notification(user_id=user_a_id, title="Alert A2", message="Msg A2")
    notif_b1 = NotificationService.create_notification(user_id=user_b_id, title="Alert B1", message="Msg B1")

    # User A requests notifications
    res_a = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    ids_a = {item["id"] for item in res_a.json()}
    assert notif_a1["id"] in ids_a
    assert notif_a2["id"] in ids_a
    assert notif_b1["id"] not in ids_a

    # User B requests notifications
    res_b = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token_b}"})
    assert res_b.status_code == 200
    ids_b = {item["id"] for item in res_b.json()}
    assert notif_b1["id"] in ids_b
    assert notif_a1["id"] not in ids_b
    assert notif_a2["id"] not in ids_b


def test_03_cross_user_access_forbidden_and_nonexistent_returns_404():
    """Verify unauthorized access to another user's notification returns 403, and missing returns 404."""
    user_a_id, token_a = _register_provider(_unique_email("notif_sec_a"))
    user_b_id, token_b = _register_provider(_unique_email("notif_sec_b"))

    notif_a = NotificationService.create_notification(user_id=user_a_id, title="Private A", message="Secret")

    # User B attempts to view User A's notification
    get_res = client.get(f"/api/v1/notifications/{notif_a['id']}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_res.status_code == 403
    assert "cannot access" in get_res.text.lower()

    # User B attempts to mark User A's notification as read
    read_res = client.patch(f"/api/v1/notifications/{notif_a['id']}/read", headers={"Authorization": f"Bearer {token_b}"})
    assert read_res.status_code == 403
    assert "cannot access" in read_res.text.lower()

    # User B attempts to mark User A's notification as unread
    unread_res = client.patch(f"/api/v1/notifications/{notif_a['id']}/unread", headers={"Authorization": f"Bearer {token_b}"})
    assert unread_res.status_code == 403

    # Non-existent notification returns 404
    non_existent = client.get("/api/v1/notifications/notif_missing_12345", headers={"Authorization": f"Bearer {token_a}"})
    assert non_existent.status_code == 404
    assert "not found" in non_existent.text.lower()

    non_existent_patch = client.patch("/api/v1/notifications/notif_missing_12345/read", headers={"Authorization": f"Bearer {token_a}"})
    assert non_existent_patch.status_code == 404


def test_04_read_unread_persistence_across_sessions_and_cache_clears():
    """Verify read and unread status updates persist directly in PostgreSQL across session boundaries."""
    user_id, token = _register_provider(_unique_email("notif_read_4"))
    notif = NotificationService.create_notification(user_id=user_id, title="Status Test", message="Verify read state")
    notif_id = notif["id"]

    # Mark as read
    res_read = client.patch(f"/api/v1/notifications/{notif_id}/read", headers={"Authorization": f"Bearer {token}"})
    assert res_read.status_code == 200
    assert res_read.json()["data"]["is_read"] is True

    # Clear memory cache
    store.notifications.clear()

    # Verify committed state in PostgreSQL
    with SessionLocal() as db:
        row = db.get(NotificationORM, notif_id)
        assert row.is_read is True

    # Mark back as unread
    res_unread = client.patch(f"/api/v1/notifications/{notif_id}/unread", headers={"Authorization": f"Bearer {token}"})
    assert res_unread.status_code == 200
    assert res_unread.json()["data"]["is_read"] is False

    # Clear cache and verify again in PostgreSQL
    store.notifications.clear()
    with SessionLocal() as db:
        row = db.get(NotificationORM, notif_id)
        assert row.is_read is False


def test_05_chronological_ordering_and_unread_counts_and_bulk_read():
    """Verify newest-first ordering, unread count accuracy, and bulk read-all."""
    user_id, token = _register_provider(_unique_email("notif_order_5"))

    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        n1 = NotificationORM(
            id=f"notif_{uuid.uuid4().hex[:8]}_{user_id}",
            user_id=user_id,
            title="Oldest Note",
            message="1",
            type="SYSTEM",
            is_read=False,
            created_at=now - timedelta(minutes=10),
        )
        n2 = NotificationORM(
            id=f"notif_{uuid.uuid4().hex[:8]}_{user_id}",
            user_id=user_id,
            title="Middle Note",
            message="2",
            type="SYSTEM",
            is_read=False,
            created_at=now - timedelta(minutes=5),
        )
        n3 = NotificationORM(
            id=f"notif_{uuid.uuid4().hex[:8]}_{user_id}",
            user_id=user_id,
            title="Newest Note",
            message="3",
            type="SYSTEM",
            is_read=False,
            created_at=now,
        )
        db.add_all([n1, n2, n3])
        db.commit()

    # Check unread count
    count_res = client.get("/api/v1/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert count_res.status_code == 200
    assert count_res.json()["unread_count"] == 3

    # Check ordering
    list_res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    titles = [item["title"] for item in list_res.json()]
    assert titles[:3] == ["Newest Note", "Middle Note", "Oldest Note"]

    # Bulk read-all
    read_all_res = client.patch("/api/v1/notifications/read-all", headers={"Authorization": f"Bearer {token}"})
    assert read_all_res.status_code == 200
    assert read_all_res.json()["updated_count"] >= 3

    # Verify unread count is now 0
    count_after = client.get("/api/v1/notifications/unread-count", headers={"Authorization": f"Bearer {token}"})
    assert count_after.status_code == 200
    assert count_after.json()["unread_count"] == 0


def test_06_match_generation_creates_notification_in_postgres():
    """Verify that candidate match generation persists a MATCH_ALERT notification in PostgreSQL."""
    donor_id, donor_token = _register_provider(_unique_email("notif_match_6"))
    recip_id, recip_token = _register_recipient(_unique_email("notif_match_recip_6"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Fresh Bakery Bread", food_type="BAKERY", perishable=False, quantity=30)

    # Inspect PostgreSQL directly for generated MATCH_ALERT notification
    with SessionLocal() as db:
        notif_row = db.query(NotificationORM).filter(
            NotificationORM.user_id == recip_id,
            NotificationORM.type == "MATCH_ALERT",
        ).first()
        assert notif_row is not None
        assert "Fresh Bakery Bread" in notif_row.message
        assert notif_row.is_read is False
        assert notif_row.match_id is not None


def test_07_reservation_acceptance_creates_notification_in_postgres():
    """Verify reservation acceptance creates RESERVATION_CONFIRMATION in PostgreSQL."""
    donor_id, donor_token = _register_provider(_unique_email("notif_res_7"))
    recip_id, recip_token = _register_recipient(_unique_email("notif_res_recip_7"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Sandwiches", food_type="BAKERY", perishable=False, quantity=40)

    with SessionLocal() as db:
        m = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_id).first()
        match_id = m.id

    # Recipient accepts match
    accept_res = client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})
    assert accept_res.status_code == 200

    # Fresh session PostgreSQL verification
    with SessionLocal() as db:
        res_notif = db.query(NotificationORM).filter(
            NotificationORM.user_id == recip_id,
            NotificationORM.type == "RESERVATION_CONFIRMATION",
            NotificationORM.match_id == match_id,
        ).first()
        assert res_notif is not None
        assert "Donation reserved" in res_notif.title
        assert "Sandwiches" in res_notif.message


def test_08_match_rejection_reallocation_creates_notification_in_postgres():
    """Verify that when a candidate rejects a match, the next candidate receives a MATCH_ALERT notification."""
    donor_id, donor_token = _register_provider(_unique_email("notif_rej_8"))
    recip_1_id, recip_1_token = _register_recipient(_unique_email("notif_rej_recip_8a"), storage_types=["DRY"], lat=17.660, lng=75.908)
    recip_2_id, recip_2_token = _register_recipient(_unique_email("notif_rej_recip_8b"), storage_types=["DRY"], lat=17.662, lng=75.910)

    donation_id = _create_donation(donor_token, title="Bagels Batch", food_type="BAKERY", perishable=False, quantity=50)

    with SessionLocal() as db:
        m1 = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_1_id).first()
        m2 = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_2_id).first()
        assert m1 is not None
        assert m2 is not None

    # Candidate 1 rejects match
    rej_res = client.post(f"/api/v1/matches/{m1.id}/reject", headers={"Authorization": f"Bearer {recip_1_token}"})
    assert rej_res.status_code == 200

    # Verify a competing match was reallocated to NOTIFIED status in PostgreSQL
    with SessionLocal() as db:
        notified_match = db.query(MatchORM).filter(
            MatchORM.donation_id == donation_id,
            MatchORM.status == "NOTIFIED",
        ).first()
        assert notified_match is not None

        # Verify the reallocated candidate received the opportunity notification
        realloc_notif = db.query(NotificationORM).filter(
            NotificationORM.user_id == notified_match.recipient_id,
            NotificationORM.match_id == notified_match.id,
            NotificationORM.title == "Donation match opportunity available",
        ).first()
        assert realloc_notif is not None
        assert realloc_notif.type == "MATCH_ALERT"



def test_09_donation_cancellation_creates_notification_in_postgres():
    """Verify that cancelling an active donation creates a cancellation notification in PostgreSQL for active candidates."""
    donor_id, donor_token = _register_provider(_unique_email("notif_cancel_9"))
    recip_id, recip_token = _register_recipient(_unique_email("notif_cancel_recip_9"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Gourmet Pastries", food_type="BAKERY", perishable=False, quantity=25)

    # Cancel donation
    cancel_res = client.post(f"/api/v1/donations/{donation_id}/cancel", headers={"Authorization": f"Bearer {donor_token}"})
    assert cancel_res.status_code == 200

    # Fresh session verification of cancellation notification
    with SessionLocal() as db:
        cancel_notifs = db.query(NotificationORM).filter(
            NotificationORM.user_id == recip_id,
            NotificationORM.title == "Donation listing cancelled",
        ).all()
        assert len(cancel_notifs) >= 1
        assert "Gourmet Pastries" in cancel_notifs[0].message


def test_10_handover_completion_creates_dual_notifications_in_postgres():
    """Verify donation completion creates persistent SYSTEM notifications for both donor and recipient."""
    donor_id, donor_token = _register_provider(_unique_email("notif_comp_10"))
    recip_id, recip_token = _register_recipient(_unique_email("notif_comp_recip_10"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Pasta Trays", food_type="BAKERY", perishable=False, quantity=45)

    with SessionLocal() as db:
        m = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_id).first()
        match_id = m.id

    # Reserve
    client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})

    # Complete handover
    comp_res = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={"confirmed_quantity_meals": 45, "notes": "Handed over safely"},
    )
    assert comp_res.status_code == 200

    # Verify both notifications in PostgreSQL
    with SessionLocal() as db:
        p_notif = db.query(NotificationORM).filter(
            NotificationORM.user_id == donor_id,
            NotificationORM.title == "Donation completed",
        ).first()
        assert p_notif is not None
        assert "45 meals rescued" in p_notif.message

        r_notif = db.query(NotificationORM).filter(
            NotificationORM.user_id == recip_id,
            NotificationORM.title == "Pickup confirmed",
        ).first()
        assert r_notif is not None
        assert "45 meals" in r_notif.message


def test_11_rollback_behavior_when_notification_persistence_fails():
    """Verify that failure during a critical transaction rolls back cleanly without leaving orphan records."""
    donor_id, donor_token = _register_provider(_unique_email("notif_rb_11"))
    recip_id, recip_token = _register_recipient(_unique_email("notif_rb_recip_11"), storage_types=["DRY"])

    donation_id = _create_donation(donor_token, title="Rollback Test Meal", food_type="BAKERY", perishable=False, quantity=30)

    with SessionLocal() as db:
        m = db.query(MatchORM).filter(MatchORM.donation_id == donation_id, MatchORM.recipient_id == recip_id).first()
        match_id = m.id

    # Simulate database failure during NotificationORM instantiation in accept_match
    with patch.object(NotificationORM, "__init__", side_effect=RuntimeError("Simulated DB notification error")):
        with pytest.raises(RuntimeError):
            client.post(f"/api/v1/matches/{match_id}/accept", headers={"Authorization": f"Bearer {recip_token}"})

    # PostgreSQL must remain in pre-transaction state
    with SessionLocal() as db:
        d_row = db.get(DonationORM, donation_id)
        m_row = db.get(MatchORM, match_id)
        assert d_row.status == "AVAILABLE"
        assert m_row.status in ("PROPOSED", "NOTIFIED")
        # No reservation notification was committed
        notifs = db.query(NotificationORM).filter_by(match_id=match_id, type="RESERVATION_CONFIRMATION").all()
        assert len(notifs) == 0


def test_12_stale_cache_cannot_overwrite_database_notification():
    """Verify that stale in-memory cache data cannot overwrite committed PostgreSQL notification states."""
    user_id, token = _register_provider(_unique_email("notif_stale_12"))
    notif = NotificationService.create_notification(user_id=user_id, title="Authoritative Note", message="DB Truth")
    notif_id = notif["id"]

    # In database, mark as read
    with SessionLocal() as db:
        row = db.get(NotificationORM, notif_id)
        row.is_read = True
        db.commit()

    # Corrupt in-memory cache to claim is_read is False
    store.notifications[notif_id]["is_read"] = False

    # Attempt to sync table from stale cache
    store.sync_notifications()

    # Verify PostgreSQL row was NOT corrupted by stale in-memory cache
    with SessionLocal() as db:
        fresh_row = db.get(NotificationORM, notif_id)
        assert fresh_row.is_read is True, "Database-authoritative is_read must be preserved"

    # In-memory cache should now be healed from the database
    assert store.notifications[notif_id]["is_read"] is True
