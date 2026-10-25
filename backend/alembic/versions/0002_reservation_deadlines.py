"""Add reservation deadlines and preserve reservation outcomes.

Revision ID: 0002_reservation_deadlines
Revises: 0001_initial_schema
"""
from datetime import timedelta, timezone

from alembic import op
import sqlalchemy as sa

revision = "0002_reservation_deadlines"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("donations", sa.Column("reserved_recipient_id", sa.String(length=64), nullable=True))
    op.add_column("donations", sa.Column("reservation_deadline", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_donations_reservation_deadline", "donations", ["reservation_deadline"])
    op.add_column("matches", sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("matches", sa.Column("pickup_deadline", sa.DateTime(timezone=True), nullable=True))
    op.add_column("matches", sa.Column("reservation_outcome", sa.String(length=32), nullable=True))
    op.create_index("ix_matches_status_pickup_deadline", "matches", ["status", "pickup_deadline"])

    connection = op.get_bind()
    matches = sa.table(
        "matches",
        sa.column("id", sa.String),
        sa.column("donation_id", sa.String),
        sa.column("recipient_id", sa.String),
        sa.column("status", sa.String),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    donations = sa.table(
        "donations",
        sa.column("id", sa.String),
        sa.column("status", sa.String),
        sa.column("reserved_recipient_id", sa.String),
        sa.column("reservation_deadline", sa.DateTime(timezone=True)),
    )
    for match in connection.execute(
        sa.select(matches.c.id, matches.c.donation_id, matches.c.recipient_id, matches.c.updated_at)
        .where(matches.c.status == "ACCEPTED")
    ):
        accepted_at = match.updated_at
        if accepted_at.tzinfo is None:
            accepted_at = accepted_at.replace(tzinfo=timezone.utc)
        deadline = accepted_at + timedelta(minutes=30)
        connection.execute(
            sa.text(
                "UPDATE matches SET accepted_at = :accepted_at, pickup_deadline = :deadline "
                "WHERE id = :match_id"
            ),
            {"accepted_at": accepted_at, "deadline": deadline, "match_id": match.id},
        )
        connection.execute(
            sa.update(donations)
            .where(donations.c.id == match.donation_id, donations.c.status == "RESERVED")
            .values(reserved_recipient_id=match.recipient_id, reservation_deadline=deadline)
        )


def downgrade() -> None:
    op.drop_index("ix_matches_status_pickup_deadline", table_name="matches")
    op.drop_column("matches", "reservation_outcome")
    op.drop_column("matches", "pickup_deadline")
    op.drop_column("matches", "accepted_at")
    op.drop_index("ix_donations_reservation_deadline", table_name="donations")
    op.drop_column("donations", "reservation_deadline")
    op.drop_column("donations", "reserved_recipient_id")
