"""
Unified error response schemas for consistent API error handling.

This module defines the standard error format used across all API endpoints.
All validation errors, business logic errors, and exceptions are transformed
into this unified format for consistent frontend handling.
"""

from pydantic import BaseModel


class ValidationErrorDetail(BaseModel):
    """Single validation error detail."""
    field: str  # Field that caused the error (e.g., "phone", "date_of_birth")
    message: str  # Human-readable error message
    type: str  # Error type (e.g., "value_error", "type_error", "required")


class ValidationErrorResponse(BaseModel):
    """Standard validation error response (422 status code)."""
    detail: str = "Validation error"
    errors: list[ValidationErrorDetail]
    status_code: int = 422


class BusinessErrorResponse(BaseModel):
    """Standard business logic error response (400 status code)."""
    detail: str  # Human-readable error message
    status_code: int = 400


class NotFoundErrorResponse(BaseModel):
    """Standard not found error response (404 status code)."""
    detail: str  # Human-readable error message
    status_code: int = 404


class AuthErrorResponse(BaseModel):
    """Standard authentication error response (401 status code)."""
    detail: str  # Human-readable error message
    status_code: int = 401


class ForbiddenErrorResponse(BaseModel):
    """Standard authorization error response (403 status code)."""
    detail: str  # Human-readable error message
    status_code: int = 403


class ServerErrorResponse(BaseModel):
    """Standard server error response (500 status code)."""
    detail: str = "Internal server error"
    status_code: int = 500
