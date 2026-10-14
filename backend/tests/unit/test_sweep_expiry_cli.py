from unittest.mock import MagicMock, patch

from app.scripts import sweep_expiry


def test_main_success_logs_sweep_summary(caplog):
    result = {
        "as_of": "2026-10-14T12:00:00+00:00",
        "expired_count": 2,
        "expired_donation_ids": ["don_test_1", "don_test_2"],
    }

    with patch.object(
        sweep_expiry.ExpiryService,
        "sweep_expired_donations",
        return_value=result,
    ) as sweep, caplog.at_level("INFO"):
        exit_code = sweep_expiry.main([])

    assert exit_code == 0
    sweep.assert_called_once_with()
    assert "expired_count=2" in caplog.text
    assert "don_test_1" in caplog.text
    assert "don_test_2" in caplog.text


def test_main_failure_returns_nonzero(caplog):
    with patch.object(
        sweep_expiry.ExpiryService,
        "sweep_expired_donations",
        side_effect=RuntimeError("simulated database failure"),
    ) as sweep, caplog.at_level("ERROR"):
        exit_code = sweep_expiry.main([])

    assert exit_code == 1
    sweep.assert_called_once_with()
    assert "Donation expiry sweep failed" in caplog.text
    assert "simulated database failure" in caplog.text


def test_dry_run_queries_eligible_donations_and_logs(caplog):
    mock_session = MagicMock()
    mock_session_cm = MagicMock()
    mock_session_cm.__enter__.return_value = mock_session
    mock_session_cm.__exit__.return_value = None

    mock_query = MagicMock()
    mock_session.query.return_value = mock_query
    mock_filter = MagicMock()
    mock_query.filter.return_value = mock_filter
    mock_order = MagicMock()
    mock_filter.order_by.return_value = mock_order
    mock_order.all.return_value = [("don_dry_1",), ("don_dry_2",)]

    with patch.object(
        sweep_expiry, "SessionLocal", return_value=mock_session_cm
    ) as mock_sl, patch.object(
        sweep_expiry.ExpiryService, "sweep_expired_donations"
    ) as mock_sweep, caplog.at_level("INFO"):
        exit_code = sweep_expiry.main(["--dry-run"])

    assert exit_code == 0
    mock_sl.assert_called_once_with()
    mock_session.query.assert_called_once_with(sweep_expiry.DonationORM.id)
    mock_sweep.assert_not_called()
    assert "Donation expiry dry-run completed" in caplog.text
    assert "eligible_count=2" in caplog.text
    assert "don_dry_1" in caplog.text
    assert "don_dry_2" in caplog.text


def test_dry_run_does_not_call_sweep_service(caplog):
    mock_session = MagicMock()
    mock_session_cm = MagicMock()
    mock_session_cm.__enter__.return_value = mock_session
    mock_session_cm.__exit__.return_value = None

    mock_query = MagicMock()
    mock_session.query.return_value = mock_query
    mock_filter = MagicMock()
    mock_query.filter.return_value = mock_filter
    mock_order = MagicMock()
    mock_filter.order_by.return_value = mock_order
    mock_order.all.return_value = []

    with patch.object(
        sweep_expiry, "SessionLocal", return_value=mock_session_cm
    ), patch.object(
        sweep_expiry.ExpiryService, "sweep_expired_donations"
    ) as mock_sweep, caplog.at_level("INFO"):
        exit_code = sweep_expiry.main(["--dry-run"])

    assert exit_code == 0
    mock_sweep.assert_not_called()
    assert "Donation expiry dry-run completed" in caplog.text
    assert "eligible_count=0" in caplog.text


def test_dry_run_failure_returns_nonzero(caplog):
    mock_session = MagicMock()
    mock_session_cm = MagicMock()
    mock_session_cm.__enter__.return_value = mock_session
    mock_session_cm.__exit__.return_value = None
    mock_session.query.side_effect = RuntimeError("simulated query error")

    with patch.object(
        sweep_expiry, "SessionLocal", return_value=mock_session_cm
    ), patch.object(
        sweep_expiry.ExpiryService, "sweep_expired_donations"
    ) as mock_sweep, caplog.at_level("ERROR"):
        exit_code = sweep_expiry.main(["--dry-run"])

    assert exit_code == 1
    mock_sweep.assert_not_called()
    assert "Donation expiry dry-run failed" in caplog.text
    assert "simulated query error" in caplog.text


def test_dry_run_session_failure_returns_nonzero(caplog):
    mock_session_cm = MagicMock()
    mock_session_cm.__enter__.side_effect = ConnectionError("simulated connection error")

    with patch.object(
        sweep_expiry, "SessionLocal", return_value=mock_session_cm
    ), patch.object(
        sweep_expiry.ExpiryService, "sweep_expired_donations"
    ) as mock_sweep, caplog.at_level("ERROR"):
        exit_code = sweep_expiry.main(["--dry-run"])

    assert exit_code == 1
    mock_sweep.assert_not_called()
    assert "Donation expiry dry-run failed" in caplog.text
    assert "simulated connection error" in caplog.text
