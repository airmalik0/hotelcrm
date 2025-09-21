import re
import uuid
from datetime import datetime, timezone

from pydantic import field_validator
from sqlalchemy import Column, DateTime
from sqlmodel import Field, SQLModel

from .common import UserRole


class UserBase(SQLModel):
    username: str = Field(unique=True, index=True, min_length=3, max_length=50)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    role: "UserRole" = Field(default=UserRole.HOST)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, hyphens and underscores"
            )
        return v


class UserCreate(SQLModel):
    username: str = Field(unique=True, index=True, min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=40)
    is_active: bool = True
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = Field(default=UserRole.HOST)
    # Note: is_superuser is intentionally not included - it cannot be set via API

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, hyphens and underscores"
            )
        return v


class UserRegister(SQLModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, hyphens and underscores"
            )
        return v


class UserUpdate(SQLModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=8, max_length=40)
    is_active: bool | None = None
    full_name: str | None = None
    role: UserRole | None = None
    # Note: is_superuser is intentionally not included - it cannot be updated via API

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        if v and not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, hyphens and underscores"
            )
        return v


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    username: str | None = Field(default=None, min_length=3, max_length=50)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        if v and not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError(
                "Username must contain only letters, numbers, hyphens and underscores"
            )
        return v


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True)))


class UserPublic(UserBase):
    id: uuid.UUID


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int
