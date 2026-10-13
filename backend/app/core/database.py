from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models import Base

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    # SQLite configuration: support local development and unit tests
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        echo=settings.DB_ECHO,
    )
    # Ensure schema tables exist for local SQLite workflows and unit test runs
    Base.metadata.create_all(bind=engine)
else:
    # PostgreSQL configuration: strictly omit SQLite-only connect args and configure connection pool
    connect_args = {}
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
        echo=settings.DB_ECHO,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def check_db_connection() -> None:
    """Verify that the configured database is reachable on startup.

    Fails loudly with a descriptive error if PostgreSQL is selected but unavailable,
    ensuring the application never silently falls back from PostgreSQL to SQLite.
    """
    try:
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        sanitized_url = engine.url.render_as_string(hide_password=True)
        dialect = "SQLite" if is_sqlite else "PostgreSQL"
        raise RuntimeError(
            f"Failed to connect to configured {dialect} database at '{sanitized_url}'. "
            f"Please ensure the database service is running and accessible. Error: {exc}"
        ) from exc


def init_db() -> None:
    """Initialize database tables for development/testing or verify connection.

    In production PostgreSQL environments, Alembic is the authoritative schema migration tool.
    For local development and test suites, Base.metadata.create_all ensures tables are present.
    """
    check_db_connection()
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_session() -> Session:
    return SessionLocal()


__all__ = ["SessionLocal", "check_db_connection", "engine", "get_db", "get_db_session", "init_db"]
