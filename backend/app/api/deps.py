from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
)
from app.models import TokenPayload, User, UserRole

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(request: Request, session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise AuthenticationError("Could not validate credentials")
    user = session.get(User, token_data.sub)
    if not user:
        raise NotFoundError("User", str(token_data.sub))
    if not user.is_active:
        raise AuthenticationError("Inactive user")
    # Expose user info to request.state for rate limiting/middleware
    try:
        request.state.user = user  # type: ignore[attr-defined]
    except Exception:
        # If request.state is not writable for any reason, ignore
        pass
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise AuthorizationError("The user doesn't have enough privileges")
    return current_user


def get_current_admin_user(current_user: CurrentUser) -> User:
    """Verify current user has admin role."""
    if current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        raise AuthorizationError("The user doesn't have admin privileges")
    return current_user


def require_admin(current_user: CurrentUser) -> User:
    """Require admin role."""
    if current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        raise AuthorizationError("Admin access required")
    return current_user


def require_admin_or_manager(current_user: CurrentUser) -> User:
    """Require admin or manager role."""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER] and not current_user.is_superuser:
        raise AuthorizationError("Admin or manager access required")
    return current_user
