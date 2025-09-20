from fastapi import APIRouter

from app.core.config import settings
from app.core.exceptions import ConfigurationError

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/health-check/")
async def health_check() -> bool:
    return True


# Sentry debug endpoint (only in staging/development)
if settings.SENTRY_DSN and settings.ENVIRONMENT != "production":

    @router.get("/sentry-debug/")
    async def trigger_error() -> None:
        """Test Sentry error reporting (disabled in production)"""
        # This will create an error in Sentry
        raise ConfigurationError("This is a test error for Sentry (only available in non-production)")
