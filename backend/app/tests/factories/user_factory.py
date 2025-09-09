"""User factory for creating test users."""
import uuid
from typing import Any

from sqlmodel import Session

from app.crud.user import user as crud_user
from app.models import User, UserCreate, UserRole, UserUpdate


class UserFactory:
    """Factory for creating test users."""

    @staticmethod
    def create_test_user(
        session: Session,
        username: str | None = None,
        password: str = "testpass123",
        role: UserRole = UserRole.HOST,
        is_active: bool = True,
        is_superuser: bool = False,
        full_name: str | None = None,
    ) -> User:
        """
        Create a test user.

        Args:
            session: Database session
            username: Username (auto-generated if None)
            password: Password for the user
            role: User role
            is_active: Whether user is active
            is_superuser: Whether user is superuser
            full_name: Full name of the user

        Returns:
            Created user
        """
        if username is None:
            username = f"testuser_{uuid.uuid4().hex[:8]}"

        user_in = UserCreate(
            username=username,
            password=password,
            role=role,
            is_active=is_active,
            is_superuser=is_superuser,
            full_name=full_name or f"Test User {username}",
        )

        return crud_user.create(session, obj_in=user_in)

    @staticmethod
    def create_admin_user(
        session: Session,
        username: str | None = None,
        password: str = "adminpass123",
    ) -> User:
        """Create an admin user."""
        return UserFactory.create_test_user(
            session=session,
            username=username or f"admin_{uuid.uuid4().hex[:8]}",
            password=password,
            role=UserRole.ADMIN,
            is_superuser=True,
        )

    @staticmethod
    def create_manager_user(
        session: Session,
        username: str | None = None,
        password: str = "managerpass123",
    ) -> User:
        """Create a manager user."""
        return UserFactory.create_test_user(
            session=session,
            username=username or f"manager_{uuid.uuid4().hex[:8]}",
            password=password,
            role=UserRole.MANAGER,
        )

    @staticmethod
    def create_host_user(
        session: Session,
        username: str | None = None,
        password: str = "hostpass123",
    ) -> User:
        """Create a host user."""
        return UserFactory.create_test_user(
            session=session,
            username=username or f"host_{uuid.uuid4().hex[:8]}",
            password=password,
            role=UserRole.HOST,
        )

    @staticmethod
    def update_user(
        session: Session,
        user: User,
        **kwargs: Any,
    ) -> User:
        """Update a user with given data."""
        user_update = UserUpdate(**kwargs)
        return crud_user.update(session, db_obj=user, obj_in=user_update)

    @staticmethod
    def get_admin_user(session: Session) -> User:
        """Get or create an admin user for testing."""
        # Try to get existing admin user
        from sqlmodel import select
        statement = select(User).where(User.role == UserRole.ADMIN).where(User.is_superuser)
        admin = session.exec(statement).first()
        if admin:
            return admin
        # Create new admin user if none exists
        return UserFactory.create_admin_user(session)
