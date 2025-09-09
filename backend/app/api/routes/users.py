import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, SessionDep, require_admin
from app.core.audit import get_change_values, get_entity_name, log_audit
from app.core.security import get_password_hash, verify_password
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
    existing_user = crud_user.get_by_username(session, username=user_in.username)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )

    user = crud_user.create(session, obj_in=user_in)

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

    if user_in.username:
        existing_user = crud_user.get_by_username(
            session, username=user_in.username
        )
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this username already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)

    # Get old and new values for audit
    old_values, new_values = get_change_values(current_user, user_data)

    current_user.sqlmodel_update(user_data)
    session.add(current_user)

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
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
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
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )

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

    session.delete(current_user)
    session.commit()
    return Message(message="User deleted successfully")


@router.post("/signup", response_model=UserPublic)
def register_user(session: SessionDep, user_in: UserRegister) -> Any:
    """
    Create new user without the need to be logged in.
    Note: In production, this endpoint should have rate limiting and possibly CAPTCHA.
    """
    existing_user = crud_user.get_by_username(session, username=user_in.username)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system",
        )
    user_create = UserCreate.model_validate(user_in)
    user = crud_user.create(session, obj_in=user_create)

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
    user = crud_user.get(session, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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

    user = crud_user.get(session, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.username:
        existing_user = crud_user.get_by_username(
            session, username=user_in.username
        )
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this username already exists"
            )

    # Get old values before update
    update_data = user_in.model_dump(exclude_unset=True)
    old_values, new_values = get_change_values(user, update_data)

    user = crud_user.update(session, db_obj=user, obj_in=user_in)

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
    user = crud_user.get(session, id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        if user.is_superuser:
            raise HTTPException(
                status_code=403, detail="Super users are not allowed to delete themselves"
            )
        raise HTTPException(
            status_code=403, detail="You cannot delete your own account. Use /me endpoint instead."
        )
    if user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Cannot delete superuser accounts"
        )
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

    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")
    return Message(message="User deleted successfully")
