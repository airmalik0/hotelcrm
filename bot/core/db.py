"""Заглушки DB: прямой доступ к БД убран, используем API бэкенда."""
import logging

logger = logging.getLogger(__name__)


def get_session():  # pragma: no cover - legacy shim
    raise RuntimeError("Direct DB access removed. Use backend API client.")


def init_db():  # pragma: no cover - legacy shim
    logger.info("DB init skipped: bot now uses backend API")


def close_db():  # pragma: no cover - legacy shim
    logger.info("DB close skipped: no engine in bot")
