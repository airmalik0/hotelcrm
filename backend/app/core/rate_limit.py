"""
Rate limiting configuration for API endpoints.
Protects against abuse and ensures fair resource usage.
"""

import logging
from collections.abc import Callable

from fastapi import Request, Response
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

logger = logging.getLogger(__name__)


def get_real_client_ip(request: Request) -> str:
    """
    Get the real client IP address, considering proxy headers.

    Args:
        request: FastAPI request object

    Returns:
        Client IP address
    """
    # Check for common proxy headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, take the first one
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct connection IP
    if request.client:
        return request.client.host

    return "127.0.0.1"


# Create limiter instance with custom key function
limiter = Limiter(
    key_func=get_real_client_ip,
    default_limits=["1000 per hour", "100 per minute"],  # Global defaults
    storage_uri="memory://",  # In-memory storage (use Redis for production)
    swallow_errors=True,  # Don't break the app if rate limiting fails
)


def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded errors.

    Args:
        request: The request that exceeded the limit
        exc: The rate limit exception

    Returns:
        JSON response with error details
    """
    response = Response(
        content=f'{{"detail": "Rate limit exceeded: {exc.detail}"}}',
        status_code=HTTP_429_TOO_MANY_REQUESTS,
        headers={
            "Retry-After": str(exc.retry_after) if hasattr(exc, 'retry_after') else "60",
            "X-RateLimit-Limit": str(exc.limit) if hasattr(exc, 'limit') else "100",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(exc.reset) if hasattr(exc, 'reset') else "",
        },
        media_type="application/json"
    )

    # Log rate limit violation
    client_ip = get_real_client_ip(request)
    logger.warning(f"Rate limit exceeded for IP {client_ip}: {request.url.path}")

    return response


# Rate limit decorators for different endpoint types
class RateLimits:
    """Common rate limit configurations for different endpoint types."""

    # Authentication endpoints - strict limits
    AUTH = "5 per minute"
    AUTH_REGISTER = "3 per hour"
    PASSWORD_RESET = "3 per hour"

    # Read operations - generous limits
    READ_LIST = "60 per minute"
    READ_SINGLE = "120 per minute"
    SEARCH = "30 per minute"

    # Write operations - moderate limits
    CREATE = "20 per minute"
    UPDATE = "30 per minute"
    DELETE = "10 per minute"

    # Critical operations - strict limits
    BOOKING_CREATE = "10 per minute"
    PAYMENT_PROCESS = "5 per minute"
    BULK_OPERATION = "2 per minute"

    # Admin operations - relaxed limits for admins
    ADMIN_OPERATION = "100 per minute"

    # Reports and exports - expensive operations
    REPORT_GENERATE = "5 per hour"
    EXPORT_DATA = "10 per hour"


def get_rate_limit_key(request: Request) -> str:
    """
    Generate a rate limit key based on user authentication.
    Authenticated users get their own bucket.

    Args:
        request: FastAPI request object

    Returns:
        Rate limit key
    """
    # Try to get user ID from request state (set by auth middleware)
    if hasattr(request.state, "user_id"):
        return f"user:{request.state.user_id}"

    # Fall back to IP-based limiting
    return get_real_client_ip(request)


def create_user_specific_limiter() -> Limiter:
    """
    Create a limiter that uses user ID when available, IP otherwise.

    Returns:
        Configured limiter instance
    """
    return Limiter(
        key_func=get_rate_limit_key,
        default_limits=["2000 per hour"],  # Higher limits for authenticated users
        storage_uri="memory://",
        swallow_errors=True,
    )


# User-specific limiter instance
user_limiter = create_user_specific_limiter()


# Utility function to apply conditional rate limiting
def conditional_rate_limit(
    condition: Callable[[Request], bool],
    limit: str
) -> Callable[[Request], str | None]:
    """
    Apply rate limiting only when a condition is met.

    Args:
        condition: Function that returns True if rate limiting should apply
        limit: Rate limit string (e.g., "10 per minute")

    Returns:
        Rate limit or None based on condition
    """
    def _limit_func(request: Request) -> str | None:
        if condition(request):
            return limit
        return None

    return _limit_func


# Example conditional limiters
def limit_non_admins(limit: str) -> Callable[[Request], str | None]:
    """Rate limit only non-admin users."""
    def check_non_admin(request: Request) -> bool:
        # Check if user is not an admin (implement based on your auth system)
        return not getattr(request.state, "is_admin", False)

    return conditional_rate_limit(check_non_admin, limit)


def limit_anonymous_only(limit: str) -> Callable[[Request], str | None]:
    """Rate limit only anonymous users."""
    def check_anonymous(request: Request) -> bool:
        return not hasattr(request.state, "user_id")

    return conditional_rate_limit(check_anonymous, limit)


# IP-based blocking for severe violations
class IPBlocker:
    """Simple IP blocking mechanism for severe rate limit violations."""

    def __init__(self, block_duration: int = 3600):
        """
        Initialize IP blocker.

        Args:
            block_duration: How long to block IPs (seconds)
        """
        self.blocked_ips: dict[str, float] = {}
        self.block_duration = block_duration
        self.violation_counts: dict[str, int] = {}
        self.violation_threshold = 10  # Block after 10 violations

    def record_violation(self, ip: str) -> None:
        """Record a rate limit violation for an IP."""
        self.violation_counts[ip] = self.violation_counts.get(ip, 0) + 1

        if self.violation_counts[ip] >= self.violation_threshold:
            import time
            self.blocked_ips[ip] = time.time() + self.block_duration
            logger.warning(f"IP {ip} blocked for {self.block_duration} seconds due to repeated violations")

    def is_blocked(self, ip: str) -> bool:
        """Check if an IP is blocked."""
        import time
        if ip in self.blocked_ips:
            if time.time() < self.blocked_ips[ip]:
                return True
            else:
                # Unblock expired IPs
                del self.blocked_ips[ip]
                self.violation_counts.pop(ip, None)
        return False

    def unblock(self, ip: str) -> None:
        """Manually unblock an IP."""
        self.blocked_ips.pop(ip, None)
        self.violation_counts.pop(ip, None)


# Global IP blocker instance
ip_blocker = IPBlocker()

