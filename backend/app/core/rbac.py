"""
Role-based access control utilities
"""
from fastapi import HTTPException, status

from app.models import User, UserRole


def check_admin_only(current_user: User) -> None:
    """Check if user has admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users have access to this resource"
        )


def check_admin_or_manager(current_user: User) -> None:
    """Check if user has admin or manager role"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Manager access required"
        )


