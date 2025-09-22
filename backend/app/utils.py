import logging
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def parse_isoformat_date(date_str: str) -> datetime:
    """
    Parse ISO format date string, handling both Z suffix and timezone offset.

    Args:
        date_str: ISO format date string (e.g., "2024-01-01T00:00:00Z" or "2024-01-01T00:00:00+00:00")

    Returns:
        Timezone-aware datetime object in UTC

    Examples:
        parse_isoformat_date("2024-01-01T00:00:00Z") → datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        parse_isoformat_date("2024-01-01T00:00:00+00:00") → datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        parse_isoformat_date("2024-01-01T00:00:00") → datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    """
    # Handle Z suffix (common in JavaScript/JSON)
    if date_str.endswith("Z"):
        date_str = date_str[:-1] + "+00:00"

    # Parse the date
    try:
        dt = datetime.fromisoformat(date_str)
    except ValueError:
        # If parsing fails, try without timezone and assume UTC
        dt = datetime.fromisoformat(date_str.replace("T", " ").split(".")[0])
        dt = dt.replace(tzinfo=timezone.utc)

    # Ensure timezone awareness (default to UTC if naive)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt
