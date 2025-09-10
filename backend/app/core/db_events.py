"""
Database event handlers for automatic field updates
"""
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import event

from app.models import Booking, Customer, Room


def setup_db_events() -> None:
    """
    Setup SQLAlchemy event listeners for automatic field updates.
    Call this after all models are imported but before any database operations.
    """
    # List of models that have updated_at field
    models_with_updated_at = [Room, Customer, Booking]

    for model in models_with_updated_at:
        @event.listens_for(model, "before_update")
        def update_updated_at(mapper: Any, connection: Any, target: Any) -> None:  # noqa: ARG001
            target.updated_at = datetime.now(timezone.utc)

    # Special handler for Customer to ensure statistics are never negative
    @event.listens_for(Customer, "before_update")
    @event.listens_for(Customer, "before_insert")
    def validate_customer_stats(mapper: Any, connection: Any, target: Any) -> None:  # noqa: ARG001
        if hasattr(target, "total_spent") and target.total_spent < 0:
            target.total_spent = 0
        if hasattr(target, "total_bookings") and target.total_bookings < 0:
            target.total_bookings = 0
