import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import JSON, Column, ForeignKey, Uuid
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class AuditLog(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        sa_column=Column(
            Uuid,
            ForeignKey("user.id", ondelete="CASCADE"),
            index=True,
        )
    )
    action: str = Field(max_length=50, index=True)
    entity_type: str = Field(max_length=50, index=True)
    entity_id: uuid.UUID
    entity_name: str = Field(max_length=255)
    description: str = Field(max_length=1000)
    old_values: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    new_values: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)

    user: Optional["User"] = Relationship()


class AuditLogPublic(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    username: str
    action: str
    entity_type: str
    entity_id: uuid.UUID
    entity_name: str
    description: str
    old_values: dict[str, Any] | None
    new_values: dict[str, Any] | None
    timestamp: datetime


class AuditLogsPublic(SQLModel):
    data: list[AuditLogPublic]
    count: int
