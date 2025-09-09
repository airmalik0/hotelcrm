from typing import Any

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Structured error response."""
    error: str
    detail: str | None = None
    code: str | None = None


class ValidationErrorResponse(BaseModel):
    """Validation error response."""
    error: str = "validation_error"
    errors: list[dict[str, Any]]


class BusinessErrorResponse(BaseModel):
    """Business logic error response."""
    error: str = "business_error"
    message: str
    code: str | None = None
