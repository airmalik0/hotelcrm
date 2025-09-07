from unittest.mock import MagicMock, patch

from app.backend_pre_start import init, logger


def test_init_successful_connection() -> None:
    engine_mock = MagicMock()

    session_mock = MagicMock()
    exec_mock = MagicMock(return_value=True)
    session_mock.configure_mock(**{"exec.return_value": exec_mock})

    # Configure Session to work as a context manager
    session_class_mock = MagicMock()
    session_class_mock.return_value.__enter__.return_value = session_mock
    session_class_mock.return_value.__exit__.return_value = None

    with (
        patch("app.backend_pre_start.Session", session_class_mock),
        patch.object(logger, "info"),
        patch.object(logger, "error"),
        patch.object(logger, "warn"),
    ):
        try:
            init(engine_mock)
            connection_successful = True
        except Exception:
            connection_successful = False

        assert (
            connection_successful
        ), "The database connection should be successful and not raise an exception."

        # Check that exec was called once with a select statement
        assert session_mock.exec.called
        assert session_mock.exec.call_count == 1
