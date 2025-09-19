import uuid
from typing import Any

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, SessionDep, require_admin
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.crud.user import user as crud_user
from app.models import (
    Message,
    UpdatePassword,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=UsersPublic, dependencies=[Depends(require_admin)])
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users. Only admin can access.
    """

    count = crud_user.count(session)
    users = crud_user.get_multi(session, skip=skip, limit=limit)

    return UsersPublic(data=users, count=count)


@router.post("/", response_model=UserPublic, dependencies=[Depends(require_admin)])
def create_user(*, session: SessionDep, current_user: CurrentUser, user_in: UserCreate) -> Any:
    """
    Create new user. Only admin can create users.
    """
    service = UserService(session)
    user = service.create_user(user_in)

    # Log audit in the same transaction
    entity_name = get_entity_name("user", user)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="user",
        entity_id=user.id,
        entity_name=entity_name,
    )

    # Single commit for both user and audit
    session.commit()
    session.refresh(user)
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """
    service = UserService(session)

    # Get old values for audit
    user_data = user_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(current_user, user_data)

    current_user = service.update_user_me(current_user, user_in)

    # Log audit if there were changes
    if old_values:
        entity_name = get_entity_name("user", current_user)
        log_audit(
            session=session,
            user=current_user,
            action="updated_profile",
            entity_type="user",
            entity_id=current_user.id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
        )

    # Single commit for both user update and audit
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    service = UserService(session)

    current_user = service.update_password(current_user, body)

    session.flush()  # Use flush instead of commit

    # Log audit for password change in same transaction
    entity_name = get_entity_name("user", current_user)
    log_audit(
        session=session,
        user=current_user,
        action="password_changed",
        entity_type="user",
        entity_id=current_user.id,
        entity_name=entity_name,
    )

    # Now commit everything together
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Delete own user.
    """
    service = UserService(session)

    # Log audit before deletion
    entity_name = get_entity_name("user", current_user)
    log_audit(
        session=session,
        user=current_user,
        action="self_deleted",
        entity_type="user",
        entity_id=current_user.id,
        entity_name=entity_name,
    )

    service.delete_user_me(current_user)
    session.commit()
    return Message(message="User deleted successfully")


@router.post("/signup", response_model=UserPublic)
def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Create new user without the need to be logged in.
    Note: In production, this endpoint should have rate limiting and possibly CAPTCHA.
    """
    service = UserService(session)

    user_create = UserCreate.model_validate(user_in)
    user = service.create_user(user_create)

    # Log audit for self-registration
    entity_name = get_entity_name("user", user)
    log_audit(
        session=session,
        user=user,  # User logs their own registration
        action="registered",
        entity_type="user",
        entity_id=user.id,
        entity_name=entity_name,
    )

    # Commit and refresh
    session.commit()
    session.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id. Users can view their own profile, admins can view any profile.
    """
    service = UserService(session)
    user = service.get_user_or_404(user_id)

    # Allow users to view their own profile
    if user.id == current_user.id:
        return user

    # Only admin can view other users
    require_admin(current_user)
    return user


@router.patch("/{user_id}", response_model=UserPublic, dependencies=[Depends(require_admin)])
def update_user(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    user_id: uuid.UUID,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user. Only admin can update users.
    """
    service = UserService(session)
    user = service.get_user_or_404(user_id)

    # Get old values before update
    update_data = user_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(user, update_data)

    user = service.update_user(user, user_in)

    # Log audit if there were changes
    if old_values:
        entity_name = get_entity_name("user", user)
        log_audit(
            session=session,
            user=current_user,
            action="updated",
            entity_type="user",
            entity_id=user.id,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
        )

    # Commit and refresh
    session.commit()
    session.refresh(user)
    return user


@router.delete("/{user_id}", dependencies=[Depends(require_admin)])
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    """
    Delete a user. Only admin can delete users.
    """
    service = UserService(session)
    user = service.get_user_or_404(user_id)

    # Log audit before deletion
    entity_name = get_entity_name("user", user)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="user",
        entity_id=user.id,
        entity_name=entity_name,
    )

    service.delete_user(user, current_user)
    session.commit()
    return Message(message="User deleted successfully")
