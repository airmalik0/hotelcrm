"""
Audit logging utilities
"""
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlmodel import Session

from app.models import AuditLog, User


def serialize_for_json(obj: Any) -> Any:
    """Convert non-JSON serializable objects to JSON-compatible format."""
    if isinstance(obj, datetime | date):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        # For SQLModel/Pydantic objects, just use their string representation
        return str(obj)
    return obj


def log_audit(
    session: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID,
    entity_name: str,
    description: str | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
) -> None:
    """
    Log an audit entry

    Args:
        session: Database session
        user: User performing the action
        action: Action performed (created, updated, deleted, checked_in, etc.)
        entity_type: Type of entity (booking, customer, room, user)
        entity_id: ID of the entity
        entity_name: Human-readable name of the entity
        description: Optional description, auto-generated if None
        old_values: Previous values for updates
        new_values: New values for updates
    """
    if description is None:
        role_display = user.role.value.title()
        description = f"{role_display} {user.username} {action} {entity_type} {entity_name}"

    audit_log = AuditLog(
        user_id=user.id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        description=description,
        old_values=serialize_for_json(old_values) if old_values else None,
        new_values=serialize_for_json(new_values) if new_values else None,
    )

    session.add(audit_log)
    # НЕ делаем commit - пусть вызывающий код решает


def get_entity_name(entity_type: str, entity: Any) -> str:
    """Get human-readable name for an entity"""
    if entity_type == "booking":
        return f"Booking #{entity.id.hex[:8]} (Room {entity.room.room_number if entity.room else 'Unknown'})"
    elif entity_type == "customer":
        return f"{entity.first_name} {entity.last_name}"
    elif entity_type == "room":
        return f"Room {entity.room_number}"
    elif entity_type == "user":
        return f"User {entity.username}"
    else:
        return f"{entity_type} {str(entity.id)[:8]}"


def get_change_values(old_entity: Any, new_data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Extract old and new values for audit logging"""
    old_values = {}
    new_values = {}

    for key, new_value in new_data.items():
        if hasattr(old_entity, key):
            old_value = getattr(old_entity, key)
            if old_value != new_value:
                old_values[key] = serialize_for_json(old_value)
                new_values[key] = serialize_for_json(new_value)

    return old_values, new_values

