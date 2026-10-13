from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserORM(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "role IN ('FOOD_PROVIDER', 'RECIPIENT', 'ADMIN')",
            name="ck_users_role",
        ),
        CheckConstraint(
            "latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)",
            name="ck_users_latitude",
        ),
        CheckConstraint(
            "longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)",
            name="ck_users_longitude",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    organization_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class DonationORM(Base):
    __tablename__ = "donations"
    __table_args__ = (
        CheckConstraint(
            "status IN ('AVAILABLE', 'RESERVED', 'COMPLETED', 'EXPIRED', 'CANCELLED')",
            name="ck_donations_status",
        ),
        CheckConstraint(
            "food_type IN ('VEGETARIAN_COOKED', 'NON_VEGETARIAN_COOKED', 'PACKAGED_GROCERY', 'PRODUCE_RAW', 'BAKERY')",
            name="ck_donations_food_type",
        ),
        CheckConstraint(
            "quantity_meals > 0",
            name="ck_donations_quantity_meals",
        ),
        CheckConstraint(
            "latitude >= -90.0 AND latitude <= 90.0",
            name="ck_donations_latitude",
        ),
        CheckConstraint(
            "longitude >= -180.0 AND longitude <= 180.0",
            name="ck_donations_longitude",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    food_type: Mapped[str] = mapped_column(String(64), nullable=False)
    perishable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    quantity_meals: Mapped[int] = mapped_column(Integer, nullable=False)
    prepared_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expiry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    pickup_address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    special_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="AVAILABLE", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class RecipientProfileORM(Base):
    __tablename__ = "recipient_profiles"
    __table_args__ = (
        CheckConstraint(
            "org_type IN ('SHELTER', 'FOOD_BANK', 'COMMUNITY_KITCHEN', 'ORPHANAGE')",
            name="ck_recipient_profiles_org_type",
        ),
        CheckConstraint(
            "daily_capacity_meals >= 0",
            name="ck_recipient_profiles_daily_capacity_meals",
        ),
        CheckConstraint(
            "dietary_preferences IN ('ALL', 'VEGETARIAN_ONLY', 'VEGAN_ONLY')",
            name="ck_recipient_profiles_dietary_preferences",
        ),
        CheckConstraint(
            "max_travel_distance_km > 0.0",
            name="ck_recipient_profiles_max_travel_distance_km",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    org_type: Mapped[str] = mapped_column(String(32), default="SHELTER", nullable=False)
    daily_capacity_meals: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    storage_types: Mapped[str] = mapped_column(Text, default="['DRY']", nullable=False)
    dietary_preferences: Mapped[str] = mapped_column(String(32), default="ALL", nullable=False)
    max_travel_distance_km: Mapped[float] = mapped_column(Float, default=15.0, nullable=False)
    operating_hours: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class MatchORM(Base):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("donation_id", "recipient_id", name="uq_matches_donation_recipient"),
        CheckConstraint(
            "status IN ('PROPOSED', 'NOTIFIED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'COMPLETED')",
            name="ck_matches_status",
        ),
        CheckConstraint(
            "compatibility_score >= 0.0 AND compatibility_score <= 1.0",
            name="ck_matches_compatibility_score",
        ),
        CheckConstraint(
            "distance_km >= 0.0",
            name="ck_matches_distance_km",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    donation_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("donations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    recipient_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    compatibility_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    matched_factors: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PROPOSED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class NotificationORM(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            "type IN ('MATCH_ALERT', 'RESERVATION_CONFIRMATION', 'EXPIRY_WARNING', 'SYSTEM')",
            name="ck_notifications_type",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    match_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey("matches.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ImpactLogORM(Base):
    __tablename__ = "impact_logs"
    __table_args__ = (
        UniqueConstraint("donation_id", name="uq_impact_logs_donation_id"),
        CheckConstraint(
            "meals_rescued > 0",
            name="ck_impact_logs_meals_rescued",
        ),
        CheckConstraint(
            "food_weight_kg > 0.0",
            name="ck_impact_logs_food_weight_kg",
        ),
        CheckConstraint(
            "co2_savings_kg >= 0.0",
            name="ck_impact_logs_co2_savings_kg",
        ),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    donation_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("donations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    match_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("matches.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    meals_rescued: Mapped[int] = mapped_column(Integer, nullable=False)
    food_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    co2_savings_kg: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
