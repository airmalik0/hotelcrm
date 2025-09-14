"""
Retry logic for database operations to handle transient failures.
"""

import logging
from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

from psycopg import OperationalError
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.exc import OperationalError as SQLAlchemyOperationalError
from tenacity import (
    RetryError,
    after_log,
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.crud.base import ConcurrentUpdateError

logger = logging.getLogger(__name__)

T = TypeVar('T')

# Define which exceptions should trigger a retry
RETRIABLE_EXCEPTIONS = (
    OperationalError,  # Database connection issues
    SQLAlchemyOperationalError,  # SQLAlchemy operational errors
    DBAPIError,  # Database API errors
    ConnectionError,  # Network connection errors
)

# Exceptions that should NOT be retried (business logic errors)
NON_RETRIABLE_EXCEPTIONS = (
    ValueError,  # Business logic validation errors
    ConcurrentUpdateError,  # Optimistic locking conflicts
    IntegrityError,  # Foreign key, unique constraints (usually not transient)
)


def db_retry(
    max_attempts: int = 3,
    wait_multiplier: int = 1,
    wait_min: int = 2,
    wait_max: int = 10
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to add retry logic to database operations.

    Args:
        max_attempts: Maximum number of retry attempts
        wait_multiplier: Multiplier for exponential backoff
        wait_min: Minimum wait time between retries (seconds)
        wait_max: Maximum wait time between retries (seconds)

    Returns:
        Decorated function with retry logic
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            # Create retry decorator with configuration
            retry_decorator = retry(
                stop=stop_after_attempt(max_attempts),
                wait=wait_exponential(
                    multiplier=wait_multiplier,
                    min=wait_min,
                    max=wait_max
                ),
                retry=retry_if_exception_type(RETRIABLE_EXCEPTIONS),
                before_sleep=before_sleep_log(logger, logging.WARNING),
                after=after_log(logger, logging.INFO),
                reraise=True
            )

            # Apply retry logic
            @retry_decorator
            def retryable_func(*a: Any, **kw: Any) -> T:
                try:
                    return func(*a, **kw)
                except NON_RETRIABLE_EXCEPTIONS:
                    # Don't retry business logic errors
                    raise
                except Exception as e:
                    # Log the error
                    logger.warning(f"Retriable error in {func.__name__}: {e}")
                    raise

            try:
                return retryable_func(*args, **kwargs)
            except RetryError as e:
                # All retries exhausted
                logger.error(f"All retries exhausted for {func.__name__}: {e.last_attempt.exception()}")
                if e.last_attempt.exception():
                    raise e.last_attempt.exception() from None
                else:
                    raise RuntimeError(f"Retry failed for {func.__name__}") from e

        return wrapper
    return decorator


def critical_db_operation(
    func: Callable[..., T]
) -> Callable[..., T]:
    """
    Decorator for critical database operations with more aggressive retry strategy.
    Use for operations that must succeed (e.g., payment processing, critical updates).

    Uses:
    - 5 retry attempts
    - Longer wait times
    - More detailed logging
    """
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> T:
        retry_decorator = retry(
            stop=stop_after_attempt(5),
            wait=wait_exponential(multiplier=2, min=3, max=30),
            retry=retry_if_exception_type(RETRIABLE_EXCEPTIONS),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            after=after_log(logger, logging.INFO),
        )

        @retry_decorator
        def retryable_func(*a: Any, **kw: Any) -> T:
            try:
                logger.info(f"Executing critical operation: {func.__name__}")
                result = func(*a, **kw)
                logger.info(f"Critical operation successful: {func.__name__}")
                return result
            except NON_RETRIABLE_EXCEPTIONS as e:
                logger.error(f"Non-retriable error in critical operation {func.__name__}: {e}")
                raise
            except Exception as e:
                logger.warning(f"Retriable error in critical operation {func.__name__}: {e}")
                raise

        try:
            return retryable_func(*args, **kwargs)
        except RetryError as e:
            logger.critical(f"Critical operation failed after all retries {func.__name__}: {e.last_attempt.exception()}")
            if e.last_attempt.exception():
                raise e.last_attempt.exception() from None
            else:
                raise RuntimeError(f"Critical operation failed: {func.__name__}") from e

    return wrapper


def idempotent_operation(
    func: Callable[..., T]
) -> Callable[..., T]:
    """
    Decorator for idempotent operations that can be safely retried.
    Use for operations like status updates, recalculations, etc.

    Uses:
    - 3 retry attempts
    - Quick retries
    - Less logging
    """
    return db_retry(max_attempts=3, wait_min=1, wait_max=5)(func)


# Example usage patterns:

"""
from app.core.retry import db_retry, critical_db_operation, idempotent_operation

class BookingService:
    @db_retry()
    def create_booking(self, booking_in: BookingCreate) -> Booking:
        # Regular booking creation with retry
        ...

    @critical_db_operation
    def process_payment(self, booking_id: UUID, amount: float) -> Payment:
        # Critical payment processing with aggressive retry
        ...

    @idempotent_operation
    def recalculate_customer_stats(self, customer_id: UUID) -> None:
        # Safe to retry multiple times
        ...
"""
