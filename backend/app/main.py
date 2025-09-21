# Main FastAPI application entry point
import logging

import sentry_sdk
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.consistency import run_all_consistency_checks
from app.core.db_events import setup_db_events
from app.core.exceptions import (
    AlreadyExistsError,
    AuthenticationError,
    AuthorizationError,
    BusinessRuleViolation,
    ConfigurationError,
    NotFoundError,
    PermissionDeniedError,
)
from app.core.exceptions import (
    ValidationError as DomainValidationError,
)
from app.core.rate_limit import custom_rate_limit_exceeded_handler, ip_blocker, limiter
from app.schemas.errors import ValidationErrorDetail, ValidationErrorResponse

logger = logging.getLogger(__name__)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(
        dsn=str(settings.SENTRY_DSN),
        environment=settings.ENVIRONMENT,
        # Capture errors (100%)
        # Performance monitoring - adjust for production load
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
        # Profiling - usually disabled in production (expensive)
        profiles_sample_rate=0.0,
        # Don't send PII by default (GDPR compliance)
        send_default_pii=False,
        # FastAPI integration is auto-enabled when fastapi is installed
    )

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

# Configure rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)  # type: ignore[arg-type]

# Add IP blocking middleware
@app.middleware("http")
async def block_banned_ips(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Middleware to block banned IPs."""
    from app.core.rate_limit import get_real_client_ip

    client_ip = get_real_client_ip(request)
    if ip_blocker.is_blocked(client_ip):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Your IP has been temporarily blocked due to excessive requests"}
        )

    # Store user info in request state for rate limiting
    if hasattr(request.state, "user"):
        request.state.user_id = getattr(request.state.user, "id", None)
        request.state.is_admin = getattr(request.state.user, "is_superuser", False) or \
                                getattr(request.state.user, "role", None) == "admin"

    response = await call_next(request)
    return response

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

# Setup database event handlers for automatic field updates
setup_db_events()


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:  # noqa: ARG001
    """
    Handle Pydantic validation errors with unified format.

    All validation errors are transformed into the standard format:
    {
        "detail": "Validation error",
        "errors": [
            {"field": "...", "message": "...", "type": "..."}
        ]
    }
    """
    error_details = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        error_details.append(
            ValidationErrorDetail(
                field=field_path,
                message=error["msg"],
                type=error["type"]
            )
        )

    response = ValidationErrorResponse(errors=error_details)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response.model_dump()
    )


@app.exception_handler(NotFoundError)
async def not_found_exception_handler(request: Request, exc: NotFoundError) -> JSONResponse:  # noqa: ARG001
    """
    Handle resource not found errors.
    Maps to HTTP 404.
    """
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)}
    )


@app.exception_handler(AlreadyExistsError)
async def already_exists_exception_handler(request: Request, exc: AlreadyExistsError) -> JSONResponse:  # noqa: ARG001
    """
    Handle resource already exists errors.
    Maps to HTTP 409 with field information.
    """
    error_details = [
        ValidationErrorDetail(
            field=exc.field,
            message=exc.message,
            type="already_exists"
        )
    ]
    response = ValidationErrorResponse(
        detail="Resource already exists",
        errors=error_details,
        status_code=409
    )
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=response.model_dump()
    )


@app.exception_handler(AuthenticationError)
async def authentication_exception_handler(request: Request, exc: AuthenticationError) -> JSONResponse:  # noqa: ARG001
    """
    Handle authentication errors.
    Maps to HTTP 401.
    """
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"detail": str(exc)},
        headers={"WWW-Authenticate": "Bearer"}
    )


@app.exception_handler(AuthorizationError)
async def authorization_exception_handler(request: Request, exc: AuthorizationError) -> JSONResponse:  # noqa: ARG001
    """
    Handle authorization errors.
    Maps to HTTP 403.
    """
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": str(exc)}
    )


@app.exception_handler(PermissionDeniedError)
async def permission_denied_exception_handler(request: Request, exc: PermissionDeniedError) -> JSONResponse:  # noqa: ARG001
    """
    Handle permission denied errors.
    Maps to HTTP 403.
    """
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"detail": str(exc)}
    )


@app.exception_handler(DomainValidationError)
async def domain_validation_exception_handler(request: Request, exc: DomainValidationError) -> JSONResponse:  # noqa: ARG001
    """
    Handle domain validation errors.
    Maps to HTTP 422.
    """
    if exc.field:
        error_details = [
            ValidationErrorDetail(
                field=exc.field,
                message=exc.message,
                type="validation_error"
            )
        ]
        response = ValidationErrorResponse(
            detail="Validation error",
            errors=error_details,
            status_code=422
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=response.model_dump()
        )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)}
    )


@app.exception_handler(ConfigurationError)
async def configuration_exception_handler(request: Request, exc: ConfigurationError) -> JSONResponse:  # noqa: ARG001
    """
    Handle configuration errors.
    Maps to HTTP 500.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)}
    )


@app.exception_handler(BusinessRuleViolation)
async def business_rule_exception_handler(request: Request, exc: BusinessRuleViolation) -> JSONResponse:  # noqa: ARG001
    """
    Handle business rule violations.
    Maps to HTTP 400 with optional field information.
    """
    if exc.field:
        error_details = [
            ValidationErrorDetail(
                field=exc.field,
                message=exc.message,
                type="business_error"
            )
        ]
        response = ValidationErrorResponse(
            detail="Business rule violation",
            errors=error_details,
            status_code=400
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=response.model_dump()
        )

    # Business error without field information
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": exc.message}
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError) -> JSONResponse:  # noqa: ARG001
    """
    Handle database integrity errors (unique constraints, foreign keys, etc).

    These errors are transformed into field-specific validation errors when possible.
    """
    error_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)

    # Parse common integrity errors for better messages
    if "duplicate key" in error_msg.lower() or "unique constraint" in error_msg.lower():
        if "room_number" in error_msg:
            field = "room_number"
            message = "Room number already exists"
        elif "phone" in error_msg:
            field = "phone"
            message = "Phone number already registered"
        elif "username" in error_msg:
            field = "username"
            message = "Username already exists"
        else:
            field = "unknown"
            message = "Duplicate value for unique field"

        error_details = [
            ValidationErrorDetail(
                field=field,
                message=message,
                type="unique_constraint"
            )
        ]
        response = ValidationErrorResponse(
            detail="Duplicate value error",
            errors=error_details,
            status_code=409
        )
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=response.model_dump()
        )
    elif "foreign key" in error_msg.lower():
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Referenced record does not exist"}
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "Database constraint violation"}
        )



# Setup scheduler for background tasks
scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def startup_event() -> None:
    """Configure and start background tasks."""
    # Schedule consistency checks - run every hour
    scheduler.add_job(
        run_all_consistency_checks,
        'interval',
        hours=1,
        id='consistency_check',
        name='Data consistency verification',
        replace_existing=True
    )

    # Also run on startup after a delay to let the app fully initialize
    scheduler.add_job(
        run_all_consistency_checks,
        'date',
        run_date=None,  # Run immediately
        id='startup_consistency_check',
        name='Startup consistency check'
    )

    scheduler.start()
    logger.info("Background scheduler started")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Cleanup on shutdown."""
    scheduler.shutdown()
    logger.info("Background scheduler stopped")
