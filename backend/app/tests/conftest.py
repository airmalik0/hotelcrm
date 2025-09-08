"""
Test configuration and fixtures.

This module provides function-scoped fixtures for true test isolation.
Each test gets its own transaction that's rolled back after the test.
"""
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine, delete

from app.core.config import settings
from app.core.db import init_db
from app.main import app
from app.models import AuditLog, Booking, Customer, Room, User
from app.tests.utils.user import authentication_token_from_username
from app.tests.utils.utils import get_superuser_token_headers

# Create a test database URL
TEST_DATABASE_URL = str(settings.SQLALCHEMY_DATABASE_URI).replace("/app", "/test_app")


@pytest.fixture(scope="session")
def engine() -> Generator[Engine, None, None]:
    """Create a test database engine."""
    test_engine = create_engine(TEST_DATABASE_URL, echo=False, pool_pre_ping=True)

    # Create all tables
    SQLModel.metadata.create_all(test_engine)

    yield test_engine

    # Drop all tables after tests
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(scope="function")
def db(engine: Engine) -> Generator[Session, None, None]:
    """
    Provide a database session for tests.
    
    Uses a simpler approach without nested transactions to avoid
    conflicts with application-level commits.
    """
    with Session(engine) as session:
        # Initialize database with superuser
        init_db(session)

        yield session

        # Clean up after test - rollback any uncommitted changes
        session.rollback()

        # Clean all data created during the test
        session.execute(delete(AuditLog))
        session.execute(delete(Booking))
        session.execute(delete(Customer))
        session.execute(delete(Room))
        session.execute(delete(User))
        session.commit()


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """
    Create a test client with the test database session.
    """
    # Override the get_db dependency to use test database
    from app.api.deps import get_db

    def get_test_db() -> Session:
        return db

    app.dependency_overrides[get_db] = get_test_db

    with TestClient(app) as test_client:
        yield test_client

    # Clear the override
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    """Get superuser authentication headers."""
    return get_superuser_token_headers(client)


@pytest.fixture(scope="function")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    """Get normal user authentication headers."""
    return authentication_token_from_username(
        client=client,
        username="testuser",
        db=db
    )


@pytest.fixture(scope="function")
def admin_user(db: Session) -> User:
    """Create an admin user for testing."""
    from app.tests.factories.user_factory import UserFactory
    return UserFactory.create_admin_user(db)


@pytest.fixture(scope="function")
def manager_user(db: Session) -> User:
    """Create a manager user for testing."""
    from app.tests.factories.user_factory import UserFactory
    return UserFactory.create_manager_user(db)


@pytest.fixture(scope="function")
def host_user(db: Session) -> User:
    """Create a host user for testing."""
    from app.tests.factories.user_factory import UserFactory
    return UserFactory.create_host_user(db)


@pytest.fixture(scope="function")
def admin_headers(client: TestClient, admin_user: User, db: Session) -> dict[str, str]:  # noqa: ARG001
    """Get admin user authentication headers."""
    from app.tests.utils.user import user_authentication_headers
    return user_authentication_headers(
        client=client,
        username=admin_user.username,
        password="adminpass123"
    )


@pytest.fixture(scope="function")
def manager_headers(client: TestClient, manager_user: User, db: Session) -> dict[str, str]:  # noqa: ARG001
    """Get manager user authentication headers."""
    from app.tests.utils.user import user_authentication_headers
    return user_authentication_headers(
        client=client,
        username=manager_user.username,
        password="managerpass123"
    )


@pytest.fixture(scope="function")
def host_headers(client: TestClient, host_user: User, db: Session) -> dict[str, str]:  # noqa: ARG001
    """Get host user authentication headers."""
    from app.tests.utils.user import user_authentication_headers
    return user_authentication_headers(
        client=client,
        username=host_user.username,
        password="hostpass123"
    )


@pytest.fixture(scope="function")
def test_room(db: Session) -> Room:
    """Create a test room."""
    from app.tests.factories.room_factory import RoomFactory
    return RoomFactory.create_test_room(db)


@pytest.fixture(scope="function")
def test_customer(db: Session) -> Customer:
    """Create a test customer."""
    from app.tests.factories.customer_factory import CustomerFactory
    return CustomerFactory.create_test_customer(db)


@pytest.fixture(scope="function")
def test_booking(db: Session, test_customer: Customer, test_room: Room) -> Booking:
    """Create a test booking."""
    from app.tests.factories.booking_factory import BookingFactory
    return BookingFactory.create_test_booking(
        db,
        customer=test_customer,
        room=test_room
    )




@pytest.fixture
def api_url() -> str:
    """Get the API base URL."""
    return settings.API_V1_STR
