"""add_foreign_keys_and_check_constraints

Revision ID: b149c0e48f72
Revises: 3c62a098bf79
Create Date: 2026-10-14 00:41:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b149c0e48f72'
down_revision: Union[str, Sequence[str], None] = '3c62a098bf79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: add foreign keys and check constraints."""
    # 1. Foreign Keys
    op.create_foreign_key(
        'fk_recipient_profiles_user_id_users',
        'recipient_profiles',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_donations_provider_id_users',
        'donations',
        'users',
        ['provider_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_matches_donation_id_donations',
        'matches',
        'donations',
        ['donation_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_matches_recipient_id_users',
        'matches',
        'users',
        ['recipient_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_notifications_user_id_users',
        'notifications',
        'users',
        ['user_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_notifications_match_id_matches',
        'notifications',
        'matches',
        ['match_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_foreign_key(
        'fk_impact_logs_donation_id_donations',
        'impact_logs',
        'donations',
        ['donation_id'],
        ['id'],
        ondelete='RESTRICT',
    )
    op.create_foreign_key(
        'fk_impact_logs_match_id_matches',
        'impact_logs',
        'matches',
        ['match_id'],
        ['id'],
        ondelete='RESTRICT',
    )

    # 2. Check Constraints
    # users
    op.create_check_constraint(
        'ck_users_role',
        'users',
        "role IN ('FOOD_PROVIDER', 'RECIPIENT', 'ADMIN')",
    )
    op.create_check_constraint(
        'ck_users_latitude',
        'users',
        "latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)",
    )
    op.create_check_constraint(
        'ck_users_longitude',
        'users',
        "longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)",
    )

    # donations
    op.create_check_constraint(
        'ck_donations_status',
        'donations',
        "status IN ('AVAILABLE', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED')",
    )
    op.create_check_constraint(
        'ck_donations_food_type',
        'donations',
        "food_type IN ('VEGETARIAN_COOKED', 'NON_VEGETARIAN_COOKED', 'PACKAGED_GROCERY', 'PRODUCE_RAW', 'BAKERY')",
    )
    op.create_check_constraint(
        'ck_donations_quantity_meals',
        'donations',
        "quantity_meals > 0",
    )
    op.create_check_constraint(
        'ck_donations_latitude',
        'donations',
        "latitude >= -90.0 AND latitude <= 90.0",
    )
    op.create_check_constraint(
        'ck_donations_longitude',
        'donations',
        "longitude >= -180.0 AND longitude <= 180.0",
    )

    # recipient_profiles
    op.create_check_constraint(
        'ck_recipient_profiles_org_type',
        'recipient_profiles',
        "org_type IN ('SHELTER', 'FOOD_BANK', 'COMMUNITY_KITCHEN', 'ORPHANAGE')",
    )
    op.create_check_constraint(
        'ck_recipient_profiles_daily_capacity_meals',
        'recipient_profiles',
        "daily_capacity_meals >= 0",
    )
    op.create_check_constraint(
        'ck_recipient_profiles_dietary_preferences',
        'recipient_profiles',
        "dietary_preferences IN ('ALL', 'VEGETARIAN_ONLY', 'VEGAN_ONLY')",
    )
    op.create_check_constraint(
        'ck_recipient_profiles_max_travel_distance_km',
        'recipient_profiles',
        "max_travel_distance_km > 0.0",
    )

    # matches
    op.create_check_constraint(
        'ck_matches_status',
        'matches',
        "status IN ('PROPOSED', 'NOTIFIED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'COMPLETED')",
    )
    op.create_check_constraint(
        'ck_matches_compatibility_score',
        'matches',
        "compatibility_score >= 0.0 AND compatibility_score <= 1.0",
    )
    op.create_check_constraint(
        'ck_matches_distance_km',
        'matches',
        "distance_km >= 0.0",
    )

    # notifications
    op.create_check_constraint(
        'ck_notifications_type',
        'notifications',
        "type IN ('MATCH_ALERT', 'RESERVATION_CONFIRMATION', 'EXPIRY_WARNING', 'SYSTEM')",
    )

    # impact_logs
    op.create_check_constraint(
        'ck_impact_logs_meals_rescued',
        'impact_logs',
        "meals_rescued > 0",
    )
    op.create_check_constraint(
        'ck_impact_logs_food_weight_kg',
        'impact_logs',
        "food_weight_kg > 0.0",
    )
    op.create_check_constraint(
        'ck_impact_logs_co2_savings_kg',
        'impact_logs',
        "co2_savings_kg >= 0.0",
    )


def downgrade() -> None:
    """Downgrade schema: drop check constraints and foreign keys."""
    # 1. Drop Check Constraints
    op.drop_constraint('ck_impact_logs_co2_savings_kg', 'impact_logs', type_='check')
    op.drop_constraint('ck_impact_logs_food_weight_kg', 'impact_logs', type_='check')
    op.drop_constraint('ck_impact_logs_meals_rescued', 'impact_logs', type_='check')

    op.drop_constraint('ck_notifications_type', 'notifications', type_='check')

    op.drop_constraint('ck_matches_distance_km', 'matches', type_='check')
    op.drop_constraint('ck_matches_compatibility_score', 'matches', type_='check')
    op.drop_constraint('ck_matches_status', 'matches', type_='check')

    op.drop_constraint('ck_recipient_profiles_max_travel_distance_km', 'recipient_profiles', type_='check')
    op.drop_constraint('ck_recipient_profiles_dietary_preferences', 'recipient_profiles', type_='check')
    op.drop_constraint('ck_recipient_profiles_daily_capacity_meals', 'recipient_profiles', type_='check')
    op.drop_constraint('ck_recipient_profiles_org_type', 'recipient_profiles', type_='check')

    op.drop_constraint('ck_donations_longitude', 'donations', type_='check')
    op.drop_constraint('ck_donations_latitude', 'donations', type_='check')
    op.drop_constraint('ck_donations_quantity_meals', 'donations', type_='check')
    op.drop_constraint('ck_donations_food_type', 'donations', type_='check')
    op.drop_constraint('ck_donations_status', 'donations', type_='check')

    op.drop_constraint('ck_users_longitude', 'users', type_='check')
    op.drop_constraint('ck_users_latitude', 'users', type_='check')
    op.drop_constraint('ck_users_role', 'users', type_='check')

    # 2. Drop Foreign Keys
    op.drop_constraint('fk_impact_logs_match_id_matches', 'impact_logs', type_='foreignkey')
    op.drop_constraint('fk_impact_logs_donation_id_donations', 'impact_logs', type_='foreignkey')
    op.drop_constraint('fk_notifications_match_id_matches', 'notifications', type_='foreignkey')
    op.drop_constraint('fk_notifications_user_id_users', 'notifications', type_='foreignkey')
    op.drop_constraint('fk_matches_recipient_id_users', 'matches', type_='foreignkey')
    op.drop_constraint('fk_matches_donation_id_donations', 'matches', type_='foreignkey')
    op.drop_constraint('fk_donations_provider_id_users', 'donations', type_='foreignkey')
    op.drop_constraint('fk_recipient_profiles_user_id_users', 'recipient_profiles', type_='foreignkey')
