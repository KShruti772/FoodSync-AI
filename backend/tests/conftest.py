from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url

postgres_test_url = os.environ.get("POSTGRES_TEST_DATABASE_URL")
test_database_path: Path | None = None

if postgres_test_url:
    test_url = make_url(postgres_test_url)
    if (
        test_url.get_backend_name() != "postgresql"
        or not test_url.database
        or not test_url.database.endswith("_test")
    ):
        raise pytest.UsageError(
            "POSTGRES_TEST_DATABASE_URL must target a PostgreSQL database whose name ends in '_test'"
        )
    os.environ["DATABASE_URL"] = postgres_test_url
else:
    test_database_path = Path(tempfile.gettempdir()) / f"foodsync-tests-{os.getpid()}.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{test_database_path.as_posix()}"

    from app.core.database import engine
    from app.models import Base

    Base.metadata.create_all(bind=engine)


def pytest_sessionfinish(session, exitstatus):
    if test_database_path is not None:
        from app.core.database import engine

        engine.dispose()
        if test_database_path.exists():
            test_database_path.unlink()
