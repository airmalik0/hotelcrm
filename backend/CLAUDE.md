# Backend Development Guidelines

## Stack
Framework: FastAPI
Database: PostgreSQL, SQLModel
Package Manager: uv (NEVER use pip/python)
Testing: pytest
Linting: ruff, mypy
Monitoring: Sentry

**Frontend Integration**: React frontend uses WowDash HTML templates as UI reference patterns.

## Commands
```bash
# Run
uv run fastapi dev app/main.py

# Test
uv run python -m pytest
uv run python -m pytest app/tests/api/routes/test_users.py
uv run python -m pytest --cov=app --cov-report=term-missing

# Lint
uv run ruff check .
uv run ruff check . --fix
uv run python -m mypy .
```

## Migrations

### Docker
```bash
docker exec hotelcrm-backend-1 alembic revision --autogenerate -m "Description"
docker exec hotelcrm-backend-1 alembic upgrade head
docker exec hotelcrm-backend-1 alembic downgrade -1
```

### Local
```bash
uv run alembic revision --autogenerate -m "Description"
uv run alembic upgrade head
uv run alembic downgrade -1
```

NOTE: Column renames need manual migration edit
NOTE: models.py changes trigger client regeneration
Reset DB: docker-compose down -v

**Important Notes:**
- Alembic doesn't detect column renames automatically - you need to manually edit the migration
- After changing models.py, the OpenAPI schema and TypeScript client auto-regenerate
- If you change fundamental fields (like username/email), you need to update frontend components too
- For clean database reset in Docker: `docker-compose down -v`

## Project Structure
```
backend/
├── app/
│   ├── api/           # API routes
│   │   ├── routes/    # Individual route modules
│   │   └── deps.py    # Dependencies (auth, db, etc)
│   ├── core/          # Core functionality
│   │   ├── config.py  # Settings and configuration
│   │   ├── db.py      # Database setup
│   │   └── security.py # Auth and security
│   ├── models.py      # SQLModel database models
│   ├── crud.py        # CRUD operations
│   ├── schemas.py     # Pydantic schemas
│   ├── utils.py       # Utility functions
│   └── main.py        # FastAPI app entry point
├── tests/             # Test files
└── alembic/           # Database migrations
```

## Key Patterns

### API Routes
- Routes are defined in `app/api/routes/`
- Use dependency injection for auth: `current_user: CurrentUser`
- Return proper HTTP status codes
- Use Pydantic models for request/response validation

### Database Models
- Defined in `app/models.py` using SQLModel
- Different model types for different purposes:
  - `table=True`: Database table models (e.g., `User`)
  - Base models: Shared properties (e.g., `UserBase`)
  - Create models: API input for creation (e.g., `UserCreate`)
  - Update models: API input for updates (e.g., `UserUpdate`)
  - Public models: API output (e.g., `UserPublic`)

#### Creating New Tables
```python
from sqlmodel import Field, SQLModel, Relationship
import uuid

# Define a new table
class Item(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(index=True, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    owner_id: uuid.UUID = Field(foreign_key="user.id")

    # Relationship
    owner: User | None = Relationship(back_populates="items")

# Add to User model
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    items: list["Item"] = Relationship(back_populates="owner")
```

After creating new models:
1. Run `uv run alembic revision --autogenerate -m "Add Item table"`
2. Review the generated migration
3. Run `uv run alembic upgrade head`
4. **Important**: The frontend TypeScript client will auto-regenerate when you save changes to models.py (via hook → generate-client.sh)

### Database Connection
- PostgreSQL runs in Docker: `localhost:5432`
- Credentials in `.env`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Direct connection: `psql -h localhost -U ${POSTGRES_USER} -d ${POSTGRES_DB}`
- Connection string format: `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost/${POSTGRES_DB}`
- Default values from .env: user=`postgres`, password=(from .env), db=`app`

### Authentication
- JWT-based authentication
- Use `CurrentUser` dependency for protected routes
- Passwords hashed with bcrypt

### Testing
- Tests mirror the app structure in `tests/`
- Use pytest fixtures for setup
- Mock external dependencies
- Test both success and error cases

#### Testing New Features
**IMPORTANT**: After implementing new functionality that works correctly, always ask the user:
> "The feature is working. Would you like me to add tests for this functionality?"

Example test structure for new API endpoint:
```python
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.core.config import settings

def test_create_item(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session
) -> None:
    data = {"title": "Test Item", "description": "Test Description"}
    r = client.post(
        f"{settings.API_V1_STR}/items/",
        headers=superuser_token_headers,
        json=data,
    )
    assert 200 <= r.status_code < 300
    content = r.json()
    assert content["title"] == data["title"]
```

## Testing Best Practices

See [TESTING.md](./TESTING.md) for comprehensive testing guidelines, patterns, and common pitfalls to avoid.

## Error Monitoring (Sentry)

Sentry is pre-configured for production error tracking:

### Configuration (in app/main.py)
- **Errors**: Always captured (100%)
- **Performance**: 10% in production, 100% in staging
- **Profiling**: Disabled (expensive)
- **PII**: Disabled by default (GDPR compliance)
- **Environment**: Automatically set from ENVIRONMENT variable

### Testing Sentry
- **Development/Staging**: Access `/api/v1/utils/sentry-debug/` to trigger test error
- **Production**: Debug endpoint is disabled for security

### Adding Custom Context
```python
import sentry_sdk

# Add user context
sentry_sdk.set_user({"id": user.id, "username": user.username})

# Add custom tags
sentry_sdk.set_tag("feature", "payment")

# Capture custom errors
try:
    process_payment()
except PaymentError as e:
    sentry_sdk.capture_exception(e)
```

## Important Notes
- **ALWAYS use `uv run` for Python commands, NEVER use `python` or `pip` directly**
- Follow existing code patterns and conventions
- Add type hints to all functions
- **ASK about tests** - After new features work, ask if tests should be added
- Check that ruff and mypy pass before committing
- **🔴 COMMIT after significant changes** - Don't forget to commit when you finish a feature or fix
- **Update documentation** - When adding new endpoints, models, or features:
  - Update this CLAUDE.md with new patterns/examples
  - Document new API endpoints and their usage
  - Add database schema changes to the models section