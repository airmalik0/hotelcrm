import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship, SQLModel


class RoomCategoryBase(SQLModel):
    name: str = Field(min_length=1, max_length=100, unique=True, index=True)
    description: str | None = Field(default=None, max_length=500)


class RoomCategory(RoomCategoryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )

    # Relationship
    rooms: list["Room"] = Relationship(back_populates="category")


class RoomCategoryCreate(RoomCategoryBase):
    pass


class RoomCategoryUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None


class RoomCategoryPublic(RoomCategoryBase):
    id: uuid.UUID
    created_at: datetime


class RoomCategoriesPublic(SQLModel):
    data: list[RoomCategoryPublic]
    count: int



