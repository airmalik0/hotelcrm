# Main FastAPI application entry point
import sentry_sdk
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy.exc import IntegrityError
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.db_events import setup_db_events


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
    Handle Pydantic validation errors with consistent format.
    """
    errors = []
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field_path,
            "message": error["msg"],
            "type": error["type"]
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": errors
        }
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(request: Request, exc: IntegrityError) -> JSONResponse:  # noqa: ARG001
    """
    Handle database integrity errors (unique constraints, foreign keys, etc).
    """
    error_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)

    # Parse common integrity errors for better messages
    if "duplicate key" in error_msg.lower() or "unique constraint" in error_msg.lower():
        if "room_number" in error_msg:
            detail = "Room number already exists"
        elif "phone" in error_msg:
            detail = "Phone number already registered"
        elif "username" in error_msg:
            detail = "Username already exists"
        else:
            detail = "Duplicate value for unique field"
    elif "foreign key" in error_msg.lower():
        detail = "Referenced record does not exist"
    else:
        detail = "Database constraint violation"

    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": detail}
    )
