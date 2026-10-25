from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserORM(Base):
    __tablename__ = "users"

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

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
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
    reserved_recipient_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reservation_deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class RecipientProfileORM(Base):
    __tablename__ = "recipient_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
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
    __table_args__ = (Index("ix_matches_status_pickup_deadline", "status", "pickup_deadline"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    donation_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    recipient_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    compatibility_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    matched_factors: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PROPOSED", nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pickup_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reservation_outcome: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class NotificationORM(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    match_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)


class ImpactLogORM(Base):
    __tablename__ = "impact_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    donation_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    match_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    meals_rescued: Mapped[int] = mapped_column(Integer, nullable=False)
    food_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    co2_savings_kg: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
