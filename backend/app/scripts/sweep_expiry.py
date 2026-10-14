from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Sequence

from app.core.database import SessionLocal
from app.models import DonationORM
from app.services.expiry_service import ExpiryService


def _extract_id(row: Any) -> str:
    if isinstance(row, str):
        return row
    if isinstance(row, (tuple, list)):
        return str(row[0])
    if hasattr(row, "__getitem__"):
        try:
            return str(row[0])
        except Exception:
            pass
    return str(getattr(row, "id", row))


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sweep expired donations or preview them in dry-run mode."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview expired donations without modifying state.",
    )
    if argv is not None:
        return parser.parse_args(list(argv))
    return parser.parse_args()


def main(argv: Sequence[str] | None = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger = logging.getLogger("app.scripts.sweep_expiry")
    args = parse_args(argv)

    if args.dry_run:
        as_of = datetime.now(timezone.utc)
        try:
            with SessionLocal() as session:
                candidates = (
                    session.query(DonationORM.id)
                    .filter(
                        DonationORM.status.in_(["AVAILABLE", "RESERVED"]),
                        DonationORM.expiry_time <= as_of,
                    )
                    .order_by(DonationORM.id)
                    .all()
                )
                eligible_donation_ids = [_extract_id(r) for r in candidates]
        except Exception:
            logger.exception("Donation expiry dry-run failed")
            return 1

        logger.info(
            "Donation expiry dry-run completed: as_of=%s eligible_count=%d",
            as_of.isoformat(),
            len(eligible_donation_ids),
        )

        for donation_id in eligible_donation_ids:
            logger.info("Eligible donation: %s", donation_id)

        return 0

    try:
        result = ExpiryService.sweep_expired_donations()
    except Exception:
        logger.exception("Donation expiry sweep failed")
        return 1

    logger.info(
        "Donation expiry sweep completed: as_of=%s expired_count=%d",
        result["as_of"],
        result["expired_count"],
    )

    for donation_id in result["expired_donation_ids"]:
        logger.info("Expired donation: %s", donation_id)

    return 0


if __name__ == "__main__":
    sys.exit(main())
