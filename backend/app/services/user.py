"""
User service layer for centralizing user business logic.
"""

from sqlmodel import Session

from app.core.security import get_password_hash, verify_password
from app.crud.user import user as crud_user
from app.models import UpdatePassword, User, UserCreate, UserUpdate, UserUpdateMe


class UserService:
    """Service class for handling user operations."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.crud = crud_user

    def create_user(self, user_in: UserCreate) -> User:
        """
        Create a new user with validations.

        Args:
            user_in: User creation data

        Returns:
            Created user

        Raises:
            ValueError: If username already exists
        """
        # Check if username exists
        if self.crud.get_by_username(self.session, username=user_in.username):
            raise ValueError("The user with this username already exists in the system")

        return self.crud.create(self.session, obj_in=user_in)

    def update_user(self, user: User, user_in: UserUpdate) -> User:
        """
        Update a user with validations.

        Args:
            user: Current user
            user_in: Update data

        Returns:
            Updated user

        Raises:
            ValueError: If username already exists
        """
        # Check username uniqueness if changing
        if user_in.username and user_in.username != user.username:
            existing_user = self.crud.get_by_username(self.session, username=user_in.username)
            if existing_user and existing_user.id != user.id:
                raise ValueError("User with this username already exists")

        return self.crud.update(self.session, db_obj=user, obj_in=user_in)

    def update_user_me(self, current_user: User, user_in: UserUpdateMe) -> User:
        """
        Update current user's own profile.

        Args:
            current_user: Current user
            user_in: Update data

        Returns:
            Updated user

        Raises:
            ValueError: If username already exists
        """
        # Check username uniqueness if changing
        if user_in.username:
            existing_user = self.crud.get_by_username(self.session, username=user_in.username)
            if existing_user and existing_user.id != current_user.id:
                raise ValueError("User with this username already exists")

        # Convert UserUpdateMe to UserUpdate for CRUD layer
        update_data = UserUpdate(**user_in.model_dump(exclude_unset=True))
        return self.crud.update(self.session, db_obj=current_user, obj_in=update_data)

    def update_password(self, current_user: User, password_update: UpdatePassword) -> User:
        """
        Update user's password.

        Args:
            current_user: Current user
            password_update: Password update data

        Returns:
            Updated user

        Raises:
            ValueError: If current password is incorrect or new password is the same
        """
        # Verify current password
        if not verify_password(password_update.current_password, current_user.hashed_password):
            raise ValueError("Incorrect password")

        # Check that new password is different
        if password_update.current_password == password_update.new_password:
            raise ValueError("New password cannot be the same as the current one")

        # Update password through CRUD
        update_data = UserUpdate(hashed_password=get_password_hash(password_update.new_password))
        return self.crud.update(self.session, db_obj=current_user, obj_in=update_data)

    def delete_user(self, user_to_delete: User, current_user: User) -> None:
        """
        Delete a user with validations.

        Args:
            user_to_delete: User to delete
            current_user: User performing the deletion

        Raises:
            ValueError: If trying to delete superuser or violating deletion rules
        """
        # Check if trying to delete self
        if user_to_delete.id == current_user.id:
            if user_to_delete.is_superuser:
                raise ValueError("Super users are not allowed to delete themselves")
            raise ValueError("You cannot delete your own account. Use /me endpoint instead")

        # Cannot delete superuser accounts
        if user_to_delete.is_superuser:
            raise ValueError("Cannot delete superuser accounts")

        self.crud.delete(self.session, id=user_to_delete.id)

    def delete_user_me(self, current_user: User) -> None:
        """
        Delete current user's own account.

        Args:
            current_user: User to delete

        Raises:
            ValueError: If user is superuser
        """
        if current_user.is_superuser:
            raise ValueError("Super users are not allowed to delete themselves")

        self.crud.delete(self.session, id=current_user.id)
