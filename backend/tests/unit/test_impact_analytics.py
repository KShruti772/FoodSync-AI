from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.core.store import store
from app.main import app
from app.services.donation_service import DonationService
from app.services.impact_service import ImpactService
from app.services.pdf_service import generate_impact_certificate_pdf


def test_impact_calculation_rules_and_idempotency():
    """Verify that impact is calculated using exact rules and recorded exactly once."""
    provider_id = "test_provider_impact_1"
    store.users[provider_id] = {
        "id": provider_id,
        "email": "prov_imp@test.com",
        "role": "FOOD_PROVIDER",
        "organization_name": "Test Impact Catering",
    }
    donation = {
        "id": "don_test_imp_1",
        "provider_id": provider_id,
        "title": "80 Rice & Dal Meals",
        "quantity_meals": 80,
        "status": "RESERVED",
    }
    match = {
        "id": "match_test_imp_1",
        "donation_id": donation["id"],
        "recipient_id": "test_recip_imp_1",
        "status": "ACCEPTED",
    }

    # First log
    impact1 = ImpactService.log_completion(donation, match, notes="Delivered warm")
    assert impact1["meals_rescued"] == 80
    assert impact1["food_weight_kg"] == 40.0  # 80 * 0.5
    assert impact1["co2_savings_kg"] == 100.0  # 40.0 * 2.5
    assert impact1["verification_notes"] == "Delivered warm"

    initial_count = len(store.impact_logs)

    # Second log for same donation (must be idempotent - exact duplicate prevention)
    impact2 = ImpactService.log_completion(donation, match, notes="Duplicate attempt")
    assert impact2["id"] == impact1["id"]
    assert len(store.impact_logs) == initial_count


def test_reconciliation_summary_and_monthly_trends():
    """Ensure summary totals reconcile 100% with underlying records and monthly trends."""
    user = {"id": "usr_reconcile_prov", "role": "FOOD_PROVIDER"}
    recip = {"id": "usr_reconcile_recip", "role": "RECIPIENT"}

    store.users[user["id"]] = {**user, "organization_name": "Reconcile Provider"}
    store.users[recip["id"]] = {**recip, "organization_name": "Reconcile Recipient"}

    # Seed 3 completed donations across two months
    d1 = {"id": "don_rec_1", "provider_id": user["id"], "title": "Meal 1", "quantity_meals": 40, "status": "COMPLETED"}
    d2 = {"id": "don_rec_2", "provider_id": user["id"], "title": "Meal 2", "quantity_meals": 60, "status": "COMPLETED"}
    d3 = {"id": "don_rec_3", "provider_id": user["id"], "title": "Meal 3", "quantity_meals": 100, "status": "COMPLETED"}
    store.donations[d1["id"]] = d1
    store.donations[d2["id"]] = d2
    store.donations[d3["id"]] = d3

    m1 = {"id": "match_rec_1", "donation_id": d1["id"], "recipient_id": recip["id"], "status": "COMPLETED"}
    m2 = {"id": "match_rec_2", "donation_id": d2["id"], "recipient_id": recip["id"], "status": "COMPLETED"}
    m3 = {"id": "match_rec_3", "donation_id": d3["id"], "recipient_id": recip["id"], "status": "COMPLETED"}
    store.matches[m1["id"]] = m1
    store.matches[m2["id"]] = m2
    store.matches[m3["id"]] = m3

    # Add logs with explicit timestamps
    store.impact_logs["imp_rec_1"] = {
        "id": "imp_rec_1",
        "donation_id": d1["id"],
        "match_id": m1["id"],
        "meals_rescued": 40,
        "food_weight_kg": 20.0,
        "co2_savings_kg": 50.0,
        "created_at": datetime(2026, 8, 15, 10, 0, tzinfo=timezone.utc),
    }
    store.impact_logs["imp_rec_2"] = {
        "id": "imp_rec_2",
        "donation_id": d2["id"],
        "match_id": m2["id"],
        "meals_rescued": 60,
        "food_weight_kg": 30.0,
        "co2_savings_kg": 75.0,
        "created_at": datetime(2026, 8, 20, 12, 0, tzinfo=timezone.utc),
    }
    store.impact_logs["imp_rec_3"] = {
        "id": "imp_rec_3",
        "donation_id": d3["id"],
        "match_id": m3["id"],
        "meals_rescued": 100,
        "food_weight_kg": 50.0,
        "co2_savings_kg": 125.0,
        "created_at": datetime(2026, 9, 10, 9, 0, tzinfo=timezone.utc),
    }

    ledger = ImpactService.get_ledger(user=user)
    summary = ledger["summary"]
    records = ledger["records"]
    monthly = ledger["monthly_trends"]

    # Reconcile summary with records
    assert summary["total_meals_rescued"] == sum(r["meals_rescued"] for r in records)
    assert summary["total_food_weight_kg"] == round(sum(r["food_weight_kg"] for r in records), 2)
    assert summary["total_co2_savings_kg"] == round(sum(r["co2_savings_kg"] for r in records), 2)
    assert summary["total_completed_donations"] == len(records)

    # Reconcile monthly breakdown with summary
    assert summary["total_meals_rescued"] == sum(m["meals_rescued"] for m in monthly)
    assert summary["total_food_weight_kg"] == round(sum(m["food_weight_kg"] for m in monthly), 2)
    assert summary["total_co2_savings_kg"] == round(sum(m["co2_savings_kg"] for m in monthly), 2)
    assert summary["total_completed_donations"] == sum(m["completed_rescues"] for m in monthly)

    # Verify chronological ascending ordering of months
    assert [m["month"] for m in monthly] == sorted([m["month"] for m in monthly])


def test_role_based_access_and_privacy():
    """Verify that Providers and Recipients only see records they are authorized to access."""
    p1 = {"id": "prov_a", "role": "FOOD_PROVIDER", "organization_name": "Kitchen A"}
    p2 = {"id": "prov_b", "role": "FOOD_PROVIDER", "organization_name": "Kitchen B"}
    r1 = {"id": "recip_a", "role": "RECIPIENT", "organization_name": "Shelter A"}
    admin = {"id": "admin_user", "role": "ADMIN", "organization_name": "FoodSync HQ"}

    store.users[p1["id"]] = p1
    store.users[p2["id"]] = p2
    store.users[r1["id"]] = r1
    store.users[admin["id"]] = admin

    d_a = {"id": "don_pa", "provider_id": p1["id"], "title": "A's food", "status": "COMPLETED"}
    d_b = {"id": "don_pb", "provider_id": p2["id"], "title": "B's food", "status": "COMPLETED"}
    store.donations[d_a["id"]] = d_a
    store.donations[d_b["id"]] = d_b

    m_a = {"id": "match_pa", "donation_id": d_a["id"], "recipient_id": r1["id"], "status": "COMPLETED"}
    m_b = {"id": "match_pb", "donation_id": d_b["id"], "recipient_id": "other_recip", "status": "COMPLETED"}
    store.matches[m_a["id"]] = m_a
    store.matches[m_b["id"]] = m_b

    store.impact_logs["imp_pa"] = {
        "id": "imp_pa",
        "donation_id": d_a["id"],
        "match_id": m_a["id"],
        "meals_rescued": 50,
        "food_weight_kg": 25.0,
        "co2_savings_kg": 62.5,
        "created_at": datetime(2026, 10, 1, tzinfo=timezone.utc),
    }
    store.impact_logs["imp_pb"] = {
        "id": "imp_pb",
        "donation_id": d_b["id"],
        "match_id": m_b["id"],
        "meals_rescued": 70,
        "food_weight_kg": 35.0,
        "co2_savings_kg": 87.5,
        "created_at": datetime(2026, 10, 2, tzinfo=timezone.utc),
    }

    # Provider A sees only their rescue
    records_pa = ImpactService.get_authorized_records(user=p1)
    assert len(records_pa) == 1
    assert records_pa[0]["donation_id"] == "don_pa"

    # Recipient A sees only the rescue where they were the recipient
    records_ra = ImpactService.get_authorized_records(user=r1)
    assert len(records_ra) == 1
    assert records_ra[0]["donation_id"] == "don_pa"

    # Admin sees all
    records_admin = ImpactService.get_authorized_records(user=admin)
    assert len(records_admin) >= 2


def test_date_boundary_filtering():
    """Verify start_date and end_date boundary filtering."""
    user = {"id": "prov_date_test", "role": "FOOD_PROVIDER"}
    store.users[user["id"]] = {**user, "organization_name": "Date Test Kitchen"}

    d = {"id": "don_date", "provider_id": user["id"], "title": "Dated food", "status": "COMPLETED"}
    store.donations[d["id"]] = d
    m = {"id": "match_date", "donation_id": d["id"], "recipient_id": "recip_x", "status": "COMPLETED"}
    store.matches[m["id"]] = m

    store.impact_logs["imp_date_oct"] = {
        "id": "imp_date_oct",
        "donation_id": d["id"],
        "match_id": m["id"],
        "meals_rescued": 10,
        "food_weight_kg": 5.0,
        "co2_savings_kg": 12.5,
        "created_at": datetime(2026, 10, 10, 12, 0, tzinfo=timezone.utc),
    }

    # Filter includes date
    in_range = ImpactService.get_authorized_records(user=user, start_date="2026-10-01", end_date="2026-10-15")
    assert any(r["id"] == "imp_date_oct" for r in in_range)

    # Filter before date (excluded)
    before_range = ImpactService.get_authorized_records(user=user, start_date="2026-09-01", end_date="2026-09-30")
    assert not any(r["id"] == "imp_date_oct" for r in before_range)

    # Filter after date (excluded)
    after_range = ImpactService.get_authorized_records(user=user, start_date="2026-11-01", end_date="2026-11-30")
    assert not any(r["id"] == "imp_date_oct" for r in after_range)


def test_csv_export_escaping_and_formula_injection_protection():
    """Verify CSV export properly sanitizes spreadsheet formula triggers (=, +, -, @)."""
    user = {"id": "prov_csv_test", "role": "FOOD_PROVIDER"}
    store.users[user["id"]] = {**user, "organization_name": "=MALICIOUS_ORG()"}

    d = {
        "id": "don_csv_formula",
        "provider_id": user["id"],
        "title": "+HYPERLINK('http://attacker.com')",
        "special_instructions": "@SUM(1+1)",
        "status": "COMPLETED",
    }
    store.donations[d["id"]] = d
    m = {"id": "match_csv", "donation_id": d["id"], "recipient_id": "recip_y", "status": "COMPLETED"}
    store.matches[m["id"]] = m

    store.impact_logs["imp_csv_formula"] = {
        "id": "imp_csv_formula",
        "donation_id": d["id"],
        "match_id": m["id"],
        "meals_rescued": 20,
        "food_weight_kg": 10.0,
        "co2_savings_kg": 25.0,
        "created_at": datetime(2026, 10, 5, tzinfo=timezone.utc),
        "verification_notes": "-CMD.EXE",
    }

    csv_data = ImpactService.export_csv(user=user)
    reader = csv.reader(io.StringIO(csv_data))
    rows = list(reader)
    assert len(rows) >= 2  # header + at least 1 record
    header = rows[0]
    assert "Rescue Reference" in header
    assert "Meals Rescued" in header

    data_row = next(r for r in rows[1:] if r[0] == "imp_csv_formula")
    # Must be sanitized with leading single quote to neutralize formula execution
    assert data_row[1].startswith("'+HYPERLINK")  # Donation Title
    assert data_row[3].startswith("'=MALICIOUS_ORG")  # Provider Organization
    assert data_row[8].startswith("'-CMD.EXE")  # Verification Notes


def test_pdf_certificate_generation_and_authorization():
    """Verify PDF certificate generation, content disclaimers, and access controls."""
    client = TestClient(app)
    owner = {"id": "usr_cert_owner", "email": "owner@cert.com", "role": "FOOD_PROVIDER", "organization_name": "Cert Owner Kitchen"}
    stranger = {"id": "usr_cert_stranger", "email": "stranger@cert.com", "role": "FOOD_PROVIDER", "organization_name": "Stranger Org"}
    store.users[owner["id"]] = owner
    store.users[stranger["id"]] = stranger

    d = {"id": "don_cert_test", "provider_id": owner["id"], "title": "100 Hot Meals", "status": "COMPLETED"}
    store.donations[d["id"]] = d
    m = {"id": "match_cert_test", "donation_id": d["id"], "recipient_id": "recip_cert", "status": "COMPLETED"}
    store.matches[m["id"]] = m

    store.impact_logs["imp_cert_test"] = {
        "id": "imp_cert_test",
        "donation_id": d["id"],
        "match_id": m["id"],
        "meals_rescued": 100,
        "food_weight_kg": 50.0,
        "co2_savings_kg": 125.0,
        "created_at": datetime(2026, 10, 12, tzinfo=timezone.utc),
    }

    # 1. Direct PDF bytes generation
    record = ImpactService.get_certificate_record("don_cert_test", owner)
    pdf_bytes = generate_impact_certificate_pdf(record)
    assert pdf_bytes.startswith(b"%PDF-1.4")
    assert b"%%EOF\n" in pdf_bytes
    assert b"FOOD RESCUE IMPACT CERTIFICATE" in pdf_bytes
    assert b"MANDATORY REGULATORY" in pdf_bytes

    # 2. Authenticated API Endpoint: Owner succeeds
    owner_token = create_access_token(owner["id"])
    res_owner = client.get(
        "/api/v1/impact/certificates/don_cert_test",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert res_owner.status_code == 200
    assert res_owner.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in res_owner.headers["content-disposition"]
    assert res_owner.content.startswith(b"%PDF-1.4")

    # 3. Authenticated API Endpoint: Stranger gets 403 Forbidden
    stranger_token = create_access_token(stranger["id"])
    res_stranger = client.get(
        "/api/v1/impact/certificates/don_cert_test",
        headers={"Authorization": f"Bearer {stranger_token}"},
    )
    assert res_stranger.status_code == 403

    # 4. Non-existent donation gets 404 Not Found
    res_missing = client.get(
        "/api/v1/impact/certificates/don_nonexistent",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert res_missing.status_code == 404


def test_api_ledger_and_csv_endpoints():
    """Verify GET /api/v1/impact/ledger and GET /api/v1/impact/export/csv endpoints."""
    client = TestClient(app)
    user = {"id": "usr_ledger_api", "email": "ledger@api.com", "role": "FOOD_PROVIDER", "organization_name": "Ledger API Cafe"}
    store.users[user["id"]] = user
    token = create_access_token(user["id"])

    # Ledger endpoint
    res = client.get("/api/v1/impact/ledger", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "monthly_trends" in data
    assert "records" in data
    assert data["scope"] == "user"

    # CSV endpoint
    csv_res = client.get("/api/v1/impact/export/csv", headers={"Authorization": f"Bearer {token}"})
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Rescue Reference" in csv_res.text
