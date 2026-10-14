from __future__ import annotations

from typing import Any


def _escape_pdf_text(text: Any) -> str:
    """Sanitize and escape text for standard PDF literal strings."""
    if text is None:
        return ""
    # Ensure ASCII / Latin-1 compatibility
    s = str(text).encode("latin-1", "replace").decode("latin-1")
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def generate_impact_certificate_pdf(record: dict[str, Any]) -> bytes:
    """Generate a valid, standalone PDF 1.4 certificate for a completed food rescue.

    Includes recorded rescue facts, estimated CO2 calculations, unique reference,
    and mandatory regulatory and scientific disclaimers. Zero external dependencies.
    """
    ref = record.get("id") or record.get("donation_id") or "CERT-UNKNOWN"
    if not ref.startswith("CERT-"):
        cert_ref = f"CERT-{ref}"
    else:
        cert_ref = ref

    completed_at = str(record.get("completed_at") or record.get("created_at") or "N/A")[:19]
    donation_title = str(record.get("donation_title") or "Surplus Food Redistribution")
    food_type = str(record.get("food_type") or "Prepared Meals")
    provider_name = str(record.get("provider_name") or "Authorized Food Provider")
    recipient_name = str(record.get("recipient_name") or "Authorized Recipient Organization")
    meals = int(record.get("meals_rescued", 0))
    weight = float(record.get("food_weight_kg", 0.0))
    co2 = float(record.get("co2_savings_kg", 0.0))
    notes = record.get("verification_notes") or "Pickup handover successfully completed and verified in-app."

    lines: list[str] = []

    # 1. Outer & Inner Border (Letter 612 x 792)
    lines.append("0.1 0.5 0.3 RG")  # Emerald outer border
    lines.append("2 w")
    lines.append("36 36 540 720 re S")

    lines.append("0.85 0.92 0.88 RG")  # Light emerald inner border
    lines.append("1 w")
    lines.append("42 42 528 708 re S")

    # 2. Header Banner
    lines.append("0.05 0.45 0.28 rg")  # Deep Emerald
    lines.append("42 660 528 90 re f")

    lines.append("BT /F2 22 Tf 1 1 1 rg 60 715 Td (FOODSYNC AI) Tj ET")
    lines.append("BT /F2 13 Tf 1 1 1 rg 60 690 Td (FOOD RESCUE IMPACT CERTIFICATE) Tj ET")
    lines.append("BT /F1 9 Tf 0.9 0.95 0.9 rg 60 672 Td (Verified Food Redistribution & Environmental Ledger Record) Tj ET")

    # 3. Certificate Reference & Date
    lines.append(f"BT /F2 10 Tf 0.2 0.2 0.2 rg 60 635 Td (Certificate Ref: {_escape_pdf_text(cert_ref)}) Tj ET")
    lines.append(f"BT /F1 9 Tf 0.35 0.35 0.35 rg 340 635 Td (Completed Date: {_escape_pdf_text(completed_at)} UTC) Tj ET")
    lines.append("0.8 0.8 0.8 RG 1 w 60 622 m 552 622 l S")

    # 4. Participating Organizations & Rescue Details
    lines.append("BT /F2 11 Tf 0.1 0.1 0.1 rg 60 600 Td (AUTHORITATIVE RESCUE PARTICIPANTS) Tj ET")

    lines.append("BT /F1 10 Tf 0.4 0.4 0.4 rg 60 578 Td (Food Provider:) Tj ET")
    lines.append(f"BT /F2 10 Tf 0.1 0.1 0.1 rg 180 578 Td ({_escape_pdf_text(provider_name)}) Tj ET")

    lines.append("BT /F1 10 Tf 0.4 0.4 0.4 rg 60 558 Td (Recipient Agency:) Tj ET")
    lines.append(f"BT /F2 10 Tf 0.1 0.1 0.1 rg 180 558 Td ({_escape_pdf_text(recipient_name)}) Tj ET")

    lines.append("BT /F1 10 Tf 0.4 0.4 0.4 rg 60 538 Td (Donation Title:) Tj ET")
    lines.append(f"BT /F2 10 Tf 0.1 0.1 0.1 rg 180 538 Td ({_escape_pdf_text(donation_title[:50])}) Tj ET")

    lines.append("BT /F1 10 Tf 0.4 0.4 0.4 rg 60 518 Td (Food Category:) Tj ET")
    lines.append(f"BT /F1 10 Tf 0.2 0.2 0.2 rg 180 518 Td ({_escape_pdf_text(food_type)}) Tj ET")

    # 5. Verified Impact Metrics Card
    lines.append("0.95 0.98 0.96 rg 60 405 492 90 re f")
    lines.append("0.1 0.5 0.3 RG 1 w 60 405 492 90 re S")
    lines.append("BT /F2 11 Tf 0.05 0.45 0.28 rg 76 472 Td (VERIFIED IMPACT RECORD) Tj ET")

    # Col 1: Meals Rescued
    lines.append(f"BT /F2 18 Tf 0.1 0.1 0.1 rg 76 440 Td ({meals:,}) Tj ET")
    lines.append("BT /F1 9 Tf 0.4 0.4 0.4 rg 76 424 Td (Confirmed Meals Rescued) Tj ET")

    # Col 2: Food Weight
    lines.append(f"BT /F2 18 Tf 0.1 0.1 0.1 rg 240 440 Td ({weight:,.1f} kg) Tj ET")
    lines.append("BT /F1 9 Tf 0.4 0.4 0.4 rg 240 424 Td (Recorded Food Diverted) Tj ET")

    # Col 3: CO2 Savings
    lines.append(f"BT /F2 18 Tf 0.05 0.45 0.28 rg 400 440 Td ({co2:,.1f} kg) Tj ET")
    lines.append("BT /F1 9 Tf 0.4 0.4 0.4 rg 400 424 Td (Estimated CO2 Prevented*) Tj ET")

    # 6. Verification Details Section
    lines.append("BT /F2 11 Tf 0.1 0.1 0.1 rg 60 375 Td (HANDOVER & VERIFICATION NOTES) Tj ET")
    lines.append("BT /F1 9 Tf 0.3 0.3 0.3 rg 60 355 Td (The physical food handover was authenticated and completed on the platform.) Tj ET")
    lines.append(f"BT /F1 9 Tf 0.2 0.2 0.2 rg 60 338 Td (Verification Notes: {_escape_pdf_text(str(notes)[:75])}) Tj ET")

    # 7. Separator & Mandatory Legal/Scientific Disclaimers
    lines.append("0.8 0.8 0.8 RG 1 w 60 270 m 552 270 l S")
    lines.append("BT /F2 9 Tf 0.25 0.25 0.25 rg 60 250 Td (MANDATORY REGULATORY & SCIENTIFIC NOTICE) Tj ET")
    lines.append(
        "BT /F1 8 Tf 0.4 0.4 0.4 rg 60 234 Td "
        "(*CO2 savings are estimated using the standard platform factor of 2.5 kg CO2e per 1.0 kg surplus food diverted from landfill.) Tj ET"
    )
    lines.append(
        "BT /F1 8 Tf 0.4 0.4 0.4 rg 60 220 Td "
        "(This certificate is generated directly from authoritative FoodSync AI authenticated completed rescue transaction logs.) Tj ET"
    )
    lines.append(
        "BT /F1 8 Tf 0.4 0.4 0.4 rg 60 206 Td "
        "(It does NOT imply governmental approval, independent tax deductibility certification, or statutory regulatory audit.) Tj ET"
    )
    lines.append(
        "BT /F1 8 Tf 0.4 0.4 0.4 rg 60 192 Td "
        "(Distinction of terms: Confirmed Meals Rescued reflects physical volume handed over; CO2 savings are analytical estimates.) Tj ET"
    )

    # 8. Security watermark & Footer
    lines.append("0.85 0.85 0.85 RG 0.5 w 60 90 m 552 90 l S")
    lines.append(
        "BT /F1 8 Tf 0.5 0.5 0.5 rg 60 74 Td "
        f"(FoodSync AI Platform Ledger - Reference ID: {_escape_pdf_text(cert_ref)} - Authenticated System Record) Tj ET"
    )
    lines.append(
        "BT /F1 7 Tf 0.6 0.6 0.6 rg 60 62 Td "
        "(Generated securely via FoodSync AI API - https://foodsync.ai - Multi-Factor Food Rescue & Redistribution Network) Tj ET"
    )

    stream_content = "\n".join(lines) + "\n"
    enc_stream = stream_content.encode("latin-1", "replace")

    # PDF Objects
    catalog = "<< /Type /Catalog /Pages 2 0 R >>"
    pages = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"
    page = (
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        "/Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>"
    )
    content = f"<< /Length {len(enc_stream)} >>\nstream\n{stream_content}endstream"
    f1 = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    f2 = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"

    objs = [catalog, pages, page, content, f1, f2]
    header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    offsets: list[int] = []
    body = bytearray(header)

    for i, obj in enumerate(objs, 1):
        offsets.append(len(body))
        block = f"{i} 0 obj\n{obj}\nendobj\n".encode("latin-1")
        body.extend(block)

    startxref = len(body)
    xref_table = f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n"
    for off in offsets:
        xref_table += f"{off:010d} 00000 n \n"
    trailer = f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{startxref}\n%%EOF\n"
    body.extend(xref_table.encode("latin-1"))
    body.extend(trailer.encode("latin-1"))

    return bytes(body)
