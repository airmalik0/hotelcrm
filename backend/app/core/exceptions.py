"""
Domain-specific exceptions for business logic.
These replace generic ValueError throughout the application.
"""

class DomainError(Exception):
    """Base class for all domain exceptions."""
    pass


class NotFoundError(DomainError):
    """Resource not found. Maps to HTTP 404."""
    def __init__(self, resource: str, identifier: str | None = None):
        self.resource = resource
        self.identifier = identifier
        if identifier:
            message = f"{resource} with id {identifier} not found"
        else:
            message = f"{resource} not found"
        super().__init__(message)


class AlreadyExistsError(DomainError):
    """Resource already exists. Maps to HTTP 409."""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(message)


class BusinessRuleViolation(DomainError):
    """Business rule violated. Maps to HTTP 400."""
    def __init__(self, message: str, field: str | None = None):
        self.message = message
        self.field = field
        super().__init__(message)


class PermissionDeniedError(DomainError):
    """Permission denied. Maps to HTTP 403."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class AuthenticationError(DomainError):
    """Authentication failed. Maps to HTTP 401."""
    def __init__(self, message: str = "Authentication required"):
        self.message = message
        super().__init__(message)


class AuthorizationError(DomainError):
    """Authorization failed. Maps to HTTP 403."""
    def __init__(self, message: str = "Insufficient permissions"):
        self.message = message
        super().__init__(message)


class ValidationError(DomainError):
    """Input validation failed. Maps to HTTP 422."""
    def __init__(self, message: str, field: str | None = None):
        self.message = message
        self.field = field
        super().__init__(message)


class ConfigurationError(DomainError):
    """Configuration error. Maps to HTTP 500."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)
