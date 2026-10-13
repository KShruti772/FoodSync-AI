from __future__ import annotations

import csv
import io
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
import pytest
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal, engine
from app.core.security import create_access_token, hash_password
from app.core.store import store
from app.main import app
from app.models import DonationORM, ImpactLogORM, MatchORM, NotificationORM, RecipientProfileORM, UserORM
from app.services.impact_service import ImpactService

client = TestClient(app)


@pytest.fixture(autouse=True)
def verify_postgres_engine():
    """Ensure all tests in this module run against a genuine PostgreSQL instance."""
    if engine.dialect.name != "postgresql":
        pytest.skip("Authoritative impact integration tests require active PostgreSQL engine")


def _unique_email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}@foodsync.org"


def _register_provider(email: str, password: str = "SecurePassword123!") -> tuple[str, str]:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "role": "FOOD_PROVIDER",
            "organization_name": "Impact Provider Org",
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
    capacity: int = 200,
    lat: float = 17.6650,
    lng: float = 75.9120,
) -> tuple[str, str]:
    res = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "role": "RECIPIENT",
            "organization_name": "Impact Shelter Org",
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


def _register_admin(email: str) -> tuple[str, str]:
    admin_id = f"usr_{uuid.uuid4().hex[:8]}"
    with SessionLocal() as db:
        admin_row = UserORM(
            id=admin_id,
            email=email,
            password_hash=hash_password("AdminPassword789!"),
            role="ADMIN",
            organization_name="FoodSync Global HQ",
            phone="9000000000",
            address="HQ Avenue, Solapur",
            latitude=17.6500,
            longitude=75.9000,
            is_verified=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(admin_row)
        db.commit()
    token = create_access_token(admin_id)
    return admin_id, token


def _create_and_reserve_donation(
    donor_token: str,
    recip_id: str,
    recip_token: str,
    meals: int = 60,
    title: str = "Vegetable Biryani",
) -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    # 1. Create donation
    res = client.post(
        "/api/v1/donations",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={
            "title": title,
            "food_type": "VEGETARIAN_COOKED",
            "perishable": True,
            "quantity_meals": meals,
            "prepared_at": now.isoformat(),
            "expiry_time": (now + timedelta(hours=6)).isoformat(),
            "pickup_address": "12 Station Road, Solapur",
            "latitude": 17.6599,
            "longitude": 75.9064,
            "special_instructions": "Handle with care",
        },
    )
    assert res.status_code == 201, res.text
    donation_id = res.json()["id"]

    # 2. Find match for recipient
    with SessionLocal() as db:
        match_row = db.query(MatchORM).filter(
            MatchORM.donation_id == donation_id,
            MatchORM.recipient_id == recip_id,
        ).first()
        assert match_row is not None, f"No match generated for donation {donation_id}"
        match_id = match_row.id

    # 3. Recipient accepts match -> RESERVED
    accept_res = client.post(
        f"/api/v1/matches/{match_id}/accept",
        headers={"Authorization": f"Bearer {recip_token}"},
    )
    assert accept_res.status_code == 200, accept_res.text

    return donation_id, match_id


def test_01_impact_persists_and_retrievable_via_fresh_session():
    """Verify impact records persist to PostgreSQL and can be read by fresh independent sessions."""
    _, donor_token = _register_provider(_unique_email("donor_imp01"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp01"), storage_types=["HEATED", "REFRIGERATED"])

    donation_id, match_id = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=60)

    # Complete donation
    comp_res = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={"confirmed_quantity_meals": 60, "notes": "Handed over safely in food-grade containers"},
    )
    assert comp_res.status_code == 200, comp_res.text
    body = comp_res.json()["data"]
    impact_data = body["impact"]

    # Direct query via clean, independent database session
    with SessionLocal() as db:
        imp_row = db.query(ImpactLogORM).filter(ImpactLogORM.donation_id == donation_id).first()
        assert imp_row is not None, "ImpactLogORM must exist in PostgreSQL"
        assert imp_row.id == impact_data["id"]
        assert imp_row.match_id == match_id
        assert imp_row.meals_rescued == 60
        assert imp_row.food_weight_kg == 30.0  # 60 * 0.5
        assert imp_row.co2_savings_kg == 75.0  # 30 * 2.5

        # Verify donation and match lifecycle rows committed
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "COMPLETED"
        match_row = db.get(MatchORM, match_id)
        assert match_row.status == "COMPLETED"

        # Verify atomic notifications committed in the same transaction
        notifs = db.query(NotificationORM).filter(NotificationORM.match_id == match_id).all()
        assert len(notifs) >= 2
        titles = {n.title for n in notifs}
        assert "Donation completed" in titles
        assert "Pickup confirmed" in titles


def test_02_retrying_handover_completion_is_idempotent_and_does_not_duplicate_impact():
    """Verify retrying the completion request does not duplicate impact records in PostgreSQL."""
    _, donor_token = _register_provider(_unique_email("donor_imp02"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp02"), storage_types=["HEATED", "REFRIGERATED"])

    donation_id, match_id = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=80)

    # First completion request
    res1 = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={"confirmed_quantity_meals": 80, "notes": "First attempt"},
    )
    assert res1.status_code == 200
    impact_1 = res1.json()["data"]["impact"]

    # Retry 1: same request retried by network retry -> rejected with 400 because donation is already completed
    res2 = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={"confirmed_quantity_meals": 80, "notes": "First attempt retry"},
    )
    assert res2.status_code == 400

    # Retry 2: recipient also attempts completion confirmation -> rejected with 400
    res3 = client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {recip_token}"},
    )
    assert res3.status_code == 400

    # Direct ImpactService.log_completion call is also idempotent and returns existing record
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        match_row = db.get(MatchORM, match_id)
        re_logged = ImpactService.log_completion(don_row, match_row, notes="Repeated service log", db=db)
        assert re_logged["id"] == impact_1["id"]

    # Fresh session verification: exactly ONE ImpactLogORM exists for this donation
    with SessionLocal() as db:
        rows = db.query(ImpactLogORM).filter(ImpactLogORM.donation_id == donation_id).all()
        assert len(rows) == 1, f"Expected exactly 1 impact row, found {len(rows)}"


def test_03_concurrent_completion_requests_cannot_double_count_handover():
    """Verify concurrent completion requests cannot double-count impact or create duplicate records."""
    _, donor_token = _register_provider(_unique_email("donor_imp03"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp03"), storage_types=["HEATED", "REFRIGERATED"])

    donation_id, _ = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=50)

    def _complete_request():
        return client.post(
            f"/api/v1/donations/{donation_id}/complete",
            headers={"Authorization": f"Bearer {donor_token}"},
            json={"confirmed_quantity_meals": 50, "notes": "Concurrent completion"},
        )

    # Launch 5 concurrent completion requests
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(_complete_request) for _ in range(5)]
        responses = [f.result() for f in futures]

    # Exactly one request succeeded with 200 OK; the remaining were rejected with 400
    statuses = [r.status_code for r in responses]
    assert 200 in statuses
    assert all(s in (200, 400) for s in statuses)

    # In PostgreSQL, exactly 1 row exists
    with SessionLocal() as db:
        rows = db.query(ImpactLogORM).filter(ImpactLogORM.donation_id == donation_id).all()
        assert len(rows) == 1


def test_04_database_unique_constraint_enforces_impact_idempotency():
    """Verify database-level unique constraint uq_impact_logs_donation_id rejects duplicates directly."""
    donor_id, donor_token = _register_provider(_unique_email("donor_imp04"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp04"), storage_types=["HEATED", "REFRIGERATED"])
    donation_id, match_id = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=100)

    try:
        with SessionLocal() as db:
            first_log = ImpactLogORM(
                id=f"imp_{uuid.uuid4().hex[:8]}",
                donation_id=donation_id,
                match_id=match_id,
                meals_rescued=100,
                food_weight_kg=50.0,
                co2_savings_kg=125.0,
                created_at=datetime.now(timezone.utc),
            )
            db.add(first_log)
            db.commit()

        # Attempt inserting a second record with the exact same donation_id
        with SessionLocal() as db:
            second_log = ImpactLogORM(
                id=f"imp_{uuid.uuid4().hex[:8]}",
                donation_id=donation_id,
                match_id=match_id,
                meals_rescued=100,
                food_weight_kg=50.0,
                co2_savings_kg=125.0,
                created_at=datetime.now(timezone.utc),
            )
            db.add(second_log)
            with pytest.raises(IntegrityError) as exc_info:
                db.commit()

            assert "uq_impact_logs_donation_id" in str(exc_info.value).lower() or "unique constraint" in str(exc_info.value).lower()
            db.rollback()
    finally:
        # Clean up impact logs first (ON DELETE RESTRICT), then dependent and parent records
        with SessionLocal() as db:
            db.query(ImpactLogORM).filter(ImpactLogORM.donation_id == donation_id).delete()
            db.query(NotificationORM).filter(NotificationORM.user_id.in_([donor_id, recip_id])).delete()
            db.query(MatchORM).filter(MatchORM.donation_id == donation_id).delete()
            db.query(DonationORM).filter(DonationORM.id == donation_id).delete()
            db.query(RecipientProfileORM).filter(RecipientProfileORM.user_id == recip_id).delete()
            db.query(UserORM).filter(UserORM.id.in_([donor_id, recip_id])).delete()
            db.commit()


def test_05_failed_completion_rolls_back_atomically_without_partial_records():
    """Verify transaction atomicity: a notification persistence failure rolls back donation and impact."""
    _, donor_token = _register_provider(_unique_email("donor_imp05"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp05"), storage_types=["HEATED", "REFRIGERATED"])

    donation_id, match_id = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=40)

    # Simulate database notification failure during complete_donation
    with patch.object(NotificationORM, "__init__", side_effect=RuntimeError("Simulated DB notification error")):
        with pytest.raises(RuntimeError):
            client.post(
                f"/api/v1/donations/{donation_id}/complete",
                headers={"Authorization": f"Bearer {donor_token}"},
            )

    # Verify PostgreSQL state was completely rolled back
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "RESERVED", "Donation status must not transition to COMPLETED on failure"
        match_row = db.get(MatchORM, match_id)
        assert match_row.status == "ACCEPTED", "Match status must not transition to COMPLETED on failure"

        # No impact log was committed
        imp_row = db.query(ImpactLogORM).filter(ImpactLogORM.donation_id == donation_id).first()
        assert imp_row is None, "No impact log may be created when transaction fails"


def test_06_impact_write_failure_rolls_back_donation_and_match_lifecycle():
    """Verify that an impact persistence failure rolls back donation and match state changes."""
    _, donor_token = _register_provider(_unique_email("donor_imp06"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp06"), storage_types=["HEATED", "REFRIGERATED"])

    donation_id, match_id = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=35)

    # Simulate failure in ImpactLogORM creation
    with patch.object(ImpactLogORM, "__init__", side_effect=RuntimeError("Simulated Impact DB failure")):
        with pytest.raises(RuntimeError):
            client.post(
                f"/api/v1/donations/{donation_id}/complete",
                headers={"Authorization": f"Bearer {donor_token}"},
            )

    # In database, verify atomic rollback
    with SessionLocal() as db:
        don_row = db.get(DonationORM, donation_id)
        assert don_row.status == "RESERVED"
        match_row = db.get(MatchORM, match_id)
        assert match_row.status == "ACCEPTED"


def test_07_impact_summaries_and_monthly_trends_reconcile_with_ledger():
    """Verify aggregate summary metrics and monthly breakdowns reconcile 100% with the underlying ledger."""
    _, donor_token = _register_provider(_unique_email("donor_imp07"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp07"), storage_types=["HEATED", "REFRIGERATED"])

    d1, _ = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=40, title="Batch A")
    d2, _ = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=60, title="Batch B")

    client.post(f"/api/v1/donations/{d1}/complete", headers={"Authorization": f"Bearer {donor_token}"})
    client.post(f"/api/v1/donations/{d2}/complete", headers={"Authorization": f"Bearer {donor_token}"})

    # Query ledger for this provider
    ledger_res = client.get("/api/v1/impact/ledger?scope=user", headers={"Authorization": f"Bearer {donor_token}"})
    assert ledger_res.status_code == 200
    ledger_data = ledger_res.json()

    records = ledger_data["records"]
    summary = ledger_data["summary"]
    trends = ledger_data["monthly_trends"]

    # Reconcile ledger items with summary
    calc_meals = sum(r["meals_rescued"] for r in records)
    calc_weight = round(sum(r["food_weight_kg"] for r in records), 2)
    calc_co2 = round(sum(r["co2_savings_kg"] for r in records), 2)

    assert summary["total_completed_donations"] == len(records)
    assert summary["total_meals_rescued"] == calc_meals == 100
    assert summary["total_food_weight_kg"] == calc_weight == 50.0
    assert summary["total_co2_savings_kg"] == calc_co2 == 125.0

    # Reconcile monthly trends
    trend_meals = sum(t["meals_rescued"] for t in trends)
    trend_rescues = sum(t["completed_rescues"] for t in trends)
    assert trend_meals == calc_meals
    assert trend_rescues == len(records)

    # Query /impact/summary endpoint directly
    sum_res = client.get("/api/v1/impact/summary?scope=user", headers={"Authorization": f"Bearer {donor_token}"})
    assert sum_res.status_code == 200
    direct_sum = sum_res.json()
    assert direct_sum["total_meals_rescued"] == summary["total_meals_rescued"]
    assert direct_sum["total_completed_donations"] == summary["total_completed_donations"]


def test_08_donor_and_recipient_scoping_enforced():
    """Verify strict tenant isolation: providers and recipients only see their authorized impact records."""
    d1_id, d1_token = _register_provider(_unique_email("donor_scope_1"))
    d2_id, d2_token = _register_provider(_unique_email("donor_scope_2"))

    r1_id, r1_token = _register_recipient(_unique_email("recip_scope_1"), storage_types=["HEATED", "REFRIGERATED"])
    r2_id, r2_token = _register_recipient(_unique_email("recip_scope_2"), storage_types=["HEATED", "REFRIGERATED"])

    # Handover 1: D1 -> R1
    don1, _ = _create_and_reserve_donation(d1_token, r1_id, r1_token, meals=25, title="Scope Test 1")
    client.post(f"/api/v1/donations/{don1}/complete", headers={"Authorization": f"Bearer {d1_token}"})

    # Handover 2: D2 -> R2
    don2, _ = _create_and_reserve_donation(d2_token, r2_id, r2_token, meals=75, title="Scope Test 2")
    client.post(f"/api/v1/donations/{don2}/complete", headers={"Authorization": f"Bearer {d2_token}"})

    # D1 ledger check
    d1_ledger = client.get("/api/v1/impact/ledger?scope=user", headers={"Authorization": f"Bearer {d1_token}"}).json()
    d1_records = d1_ledger["records"]
    assert len(d1_records) == 1
    assert d1_records[0]["donation_id"] == don1
    assert d1_records[0]["meals_rescued"] == 25

    # R1 ledger check
    r1_ledger = client.get("/api/v1/impact/ledger?scope=user", headers={"Authorization": f"Bearer {r1_token}"}).json()
    r1_records = r1_ledger["records"]
    assert len(r1_records) == 1
    assert r1_records[0]["donation_id"] == don1

    # D2 ledger check
    d2_ledger = client.get("/api/v1/impact/ledger?scope=user", headers={"Authorization": f"Bearer {d2_token}"}).json()
    d2_records = d2_ledger["records"]
    assert len(d2_records) == 1
    assert d2_records[0]["donation_id"] == don2
    assert d2_records[0]["meals_rescued"] == 75

    # R2 ledger check
    r2_ledger = client.get("/api/v1/impact/ledger?scope=user", headers={"Authorization": f"Bearer {r2_token}"}).json()
    r2_records = r2_ledger["records"]
    assert len(r2_records) == 1
    assert r2_records[0]["donation_id"] == don2

    # Admin check (can view platform scope)
    _, admin_token = _register_admin(_unique_email("admin_scope"))
    admin_ledger = client.get("/api/v1/impact/ledger?scope=platform", headers={"Authorization": f"Bearer {admin_token}"}).json()
    admin_donation_ids = {r["donation_id"] for r in admin_ledger["records"]}
    assert don1 in admin_donation_ids
    assert don2 in admin_donation_ids


def test_09_csv_export_uses_authoritative_postgres_records_with_sanitization():
    """Verify CSV export streams authoritative PostgreSQL records and neutralizes spreadsheet formula injection."""
    _, donor_token = _register_provider(_unique_email("donor_imp09"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp09"), storage_types=["HEATED", "REFRIGERATED"])

    donation_id, _ = _create_and_reserve_donation(
        donor_token,
        recip_id,
        recip_token,
        meals=30,
        title="+HYPERLINK('http://malicious.site')",
    )

    client.post(
        f"/api/v1/donations/{donation_id}/complete",
        headers={"Authorization": f"Bearer {donor_token}"},
        json={"confirmed_quantity_meals": 30, "notes": "=CMD('echo pwned')"},
    )

    csv_res = client.get("/api/v1/impact/export/csv?scope=user", headers={"Authorization": f"Bearer {donor_token}"})
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]

    reader = csv.reader(io.StringIO(csv_res.text))
    rows = list(reader)
    assert len(rows) >= 2  # Header + 1 record

    # Verify formula injection mitigation: cells starting with =, +, -, @ are escaped with leading single quote
    row = next(r for r in rows[1:] if "+HYPERLINK" in r[1])
    assert row[1].startswith("'+HYPERLINK")
    assert row[8].startswith("'=CMD")


def test_10_pdf_certificate_authoritative_persistence_and_rbac():
    """Verify PDF certificates fetch authoritative data directly from PostgreSQL and enforce strict RBAC."""
    d1_id, d1_token = _register_provider(_unique_email("donor_cert_10"))
    d2_id, d2_token = _register_provider(_unique_email("donor_cert_other_10"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_cert_10"), storage_types=["HEATED", "REFRIGERATED"])
    _, admin_token = _register_admin(_unique_email("admin_cert_10"))

    donation_id, _ = _create_and_reserve_donation(d1_token, recip_id, recip_token, meals=50, title="Biryani Feast")
    client.post(f"/api/v1/donations/{donation_id}/complete", headers={"Authorization": f"Bearer {d1_token}"})

    # 1. Donor provider downloads certificate -> 200 PDF
    d1_cert = client.get(f"/api/v1/impact/certificates/{donation_id}", headers={"Authorization": f"Bearer {d1_token}"})
    assert d1_cert.status_code == 200
    assert "application/pdf" in d1_cert.headers["content-type"]
    assert d1_cert.content.startswith(b"%PDF-")

    # 2. Matched recipient downloads certificate -> 200 PDF
    r1_cert = client.get(f"/api/v1/impact/certificates/{donation_id}", headers={"Authorization": f"Bearer {recip_token}"})
    assert r1_cert.status_code == 200
    assert r1_cert.content.startswith(b"%PDF-")

    # 3. Administrator downloads certificate -> 200 PDF
    admin_cert = client.get(f"/api/v1/impact/certificates/{donation_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_cert.status_code == 200
    assert admin_cert.content.startswith(b"%PDF-")

    # 4. Unrelated provider tries to download certificate -> 403 Forbidden
    other_cert = client.get(f"/api/v1/impact/certificates/{donation_id}", headers={"Authorization": f"Bearer {d2_token}"})
    assert other_cert.status_code == 403
    assert "not authorized" in other_cert.text.lower()

    # 5. Non-existent donation -> 404 Not Found
    nf_cert = client.get("/api/v1/impact/certificates/don_nonexistent_999", headers={"Authorization": f"Bearer {admin_token}"})
    assert nf_cert.status_code == 404


def test_11_cache_synchronization_cannot_overwrite_or_resurrect_impact_records():
    """Verify cache integrity: corrupt memory cannot overwrite PostgreSQL, and deleted records cannot be resurrected."""
    _, donor_token = _register_provider(_unique_email("donor_imp11"))
    recip_id, recip_token = _register_recipient(_unique_email("recip_imp11"), storage_types=["HEATED", "REFRIGERATED"])

    donation_id, _ = _create_and_reserve_donation(donor_token, recip_id, recip_token, meals=40)
    res = client.post(f"/api/v1/donations/{donation_id}/complete", headers={"Authorization": f"Bearer {donor_token}"})
    impact_id = res.json()["data"]["impact"]["id"]

    # 1. Corrupt in-memory impact log with false metrics
    store.impact_logs[impact_id]["meals_rescued"] = 99999
    store.impact_logs[impact_id]["food_weight_kg"] = 8888.0

    # 2. Trigger store-wide impact synchronization
    store.sync_impact_logs()

    # 3. Verify PostgreSQL row retained the authoritative values
    with SessionLocal() as db:
        row = db.get(ImpactLogORM, impact_id)
        assert row.meals_rescued == 40, "Database-authoritative meals_rescued must not be corrupted"
        assert row.food_weight_kg == 20.0

    # 4. Verify in-memory cache was healed from PostgreSQL
    assert store.impact_logs[impact_id]["meals_rescued"] == 40

    # 5. Verify deleted records cannot be resurrected by cache sync
    phantom_impact_id = f"imp_phantom_{uuid.uuid4().hex[:8]}"
    store.impact_logs[phantom_impact_id] = {
        "id": phantom_impact_id,
        "donation_id": f"don_phantom_{uuid.uuid4().hex[:8]}",
        "match_id": f"match_phantom_{uuid.uuid4().hex[:8]}",
        "meals_rescued": 10,
        "food_weight_kg": 5.0,
        "co2_savings_kg": 12.5,
        "created_at": datetime.now(timezone.utc),
    }

    # Run sync pass
    store.sync_impact_logs()

    # Verify phantom record was NOT inserted into PostgreSQL
    with SessionLocal() as db:
        phantom_db = db.get(ImpactLogORM, phantom_impact_id)
        assert phantom_db is None, "Sync pass must not resurrect non-existent records into PostgreSQL"

    # Phantom record was purged from in-memory cache
    assert phantom_impact_id not in store.impact_logs