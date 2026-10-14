from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.security import get_current_active_user, get_optional_current_user
from app.schemas.impact import ImpactLedgerResponse, ImpactSummaryResponse
from app.services.impact_service import ImpactService
from app.services.pdf_service import generate_impact_certificate_pdf

router = APIRouter(prefix="/impact", tags=["Impact"])


@router.get("/summary", response_model=ImpactSummaryResponse)
def get_impact_summary(
    scope: str = Query("auto", pattern="^(auto|user|platform)$"),
    start_date: Optional[str] = Query(None, description="ISO or YYYY-MM-DD start date filter"),
    end_date: Optional[str] = Query(None, description="ISO or YYYY-MM-DD end date filter"),
    current_user: Optional[dict] = Depends(get_optional_current_user),
):
    """Retrieve aggregate impact summary metrics.

    Public callers receive platform metrics. Authenticated providers and recipients
    receive their organization-scoped metrics by default, or platform metrics if scope=platform.
    """
    data = ImpactService.summary(
        user=current_user,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
    )
    return ImpactSummaryResponse.model_validate(data)


@router.get("/ledger", response_model=ImpactLedgerResponse)
def get_impact_ledger(
    scope: str = Query("auto", pattern="^(auto|user|platform)$"),
    start_date: Optional[str] = Query(None, description="ISO or YYYY-MM-DD start date filter"),
    end_date: Optional[str] = Query(None, description="ISO or YYYY-MM-DD end date filter"),
    current_user: dict = Depends(get_current_active_user),
):
    """Retrieve authorized historical impact ledger with monthly trend breakdowns."""
    ledger_data = ImpactService.get_ledger(
        user=current_user,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
    )
    return ImpactLedgerResponse.model_validate(ledger_data)


@router.get("/export/csv")
def export_impact_csv(
    scope: str = Query("auto", pattern="^(auto|user|platform)$"),
    start_date: Optional[str] = Query(None, description="ISO or YYYY-MM-DD start date filter"),
    end_date: Optional[str] = Query(None, description="ISO or YYYY-MM-DD end date filter"),
    current_user: dict = Depends(get_current_active_user),
):
    """Export authorized completed rescue records as an RFC 4180 CSV with formula sanitization."""
    csv_content = ImpactService.export_csv(
        user=current_user,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
    )
    filename = "foodsync_impact_ledger.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


@router.get("/certificates/{donation_id}")
def download_impact_certificate(
    donation_id: str,
    current_user: dict = Depends(get_current_active_user),
):
    """Download authoritative PDF impact certificate for a completed rescue.

    Access is strictly restricted to the donor provider, matched recipient, or administrators.
    """
    try:
        record = ImpactService.get_certificate_record(donation_id, current_user)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "error": {"code": "FORBIDDEN", "message": str(exc)}},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "error": {"code": "NOT_FOUND", "message": str(exc)}},
        ) from exc

    pdf_bytes = generate_impact_certificate_pdf(record)
    filename = f"foodsync_certificate_{donation_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
