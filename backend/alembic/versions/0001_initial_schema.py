"""Create the initial FoodSync PostgreSQL schema.

Revision ID: 0001_initial_schema
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("organization_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "donations",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("provider_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("food_type", sa.String(length=64), nullable=False),
        sa.Column("perishable", sa.Boolean(), nullable=False),
        sa.Column("quantity_meals", sa.Integer(), nullable=False),
        sa.Column("prepared_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expiry_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pickup_address", sa.Text(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("special_instructions", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_donations_provider_id", "donations", ["provider_id"])

    op.create_table(
        "recipient_profiles",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("org_type", sa.String(length=32), nullable=False),
        sa.Column("daily_capacity_meals", sa.Integer(), nullable=False),
        sa.Column("storage_types", sa.Text(), nullable=False),
        sa.Column("dietary_preferences", sa.String(length=32), nullable=False),
        sa.Column("max_travel_distance_km", sa.Float(), nullable=False),
        sa.Column("operating_hours", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_recipient_profiles_user_id", "recipient_profiles", ["user_id"], unique=True)

    op.create_table(
        "matches",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("donation_id", sa.String(length=64), nullable=False),
        sa.Column("recipient_id", sa.String(length=64), nullable=False),
        sa.Column("compatibility_score", sa.Float(), nullable=False),
        sa.Column("distance_km", sa.Float(), nullable=False),
        sa.Column("matched_factors", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_matches_donation_id", "matches", ["donation_id"])
    op.create_index("ix_matches_recipient_id", "matches", ["recipient_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("match_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "impact_logs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("donation_id", sa.String(length=64), nullable=False),
        sa.Column("match_id", sa.String(length=64), nullable=False),
        sa.Column("meals_rescued", sa.Integer(), nullable=False),
        sa.Column("food_weight_kg", sa.Float(), nullable=False),
        sa.Column("co2_savings_kg", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_impact_logs_donation_id", "impact_logs", ["donation_id"])
    op.create_index("ix_impact_logs_match_id", "impact_logs", ["match_id"])


def downgrade() -> None:
    op.drop_index("ix_impact_logs_match_id", table_name="impact_logs")
    op.drop_index("ix_impact_logs_donation_id", table_name="impact_logs")
    op.drop_table("impact_logs")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_matches_recipient_id", table_name="matches")
    op.drop_index("ix_matches_donation_id", table_name="matches")
    op.drop_table("matches")
    op.drop_index("ix_recipient_profiles_user_id", table_name="recipient_profiles")
    op.drop_table("recipient_profiles")
    op.drop_index("ix_donations_provider_id", table_name="donations")
    op.drop_table("donations")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
