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
│   ├── api/           # API routes (HTTP layer)
│   │   ├── routes/    # Individual route modules
│   │   └── deps.py    # Dependencies (auth, db, permissions)
│   ├── core/          # Core functionality
│   │   ├── config.py  # Settings and configuration
│   │   ├── db.py      # Database setup
│   │   └── security.py # Auth and security
│   ├── services/      # Business logic layer
│   ├── crud/          # Database operations layer
│   ├── models.py      # SQLModel database models
│   ├── schemas.py     # Pydantic schemas
│   ├── utils.py       # Utility functions
│   └── main.py        # FastAPI app entry point
├── tests/             # Test files
└── alembic/           # Database migrations
```

## Architecture Guidelines

### CRITICAL: Follow Clean Architecture Pattern
```
Request → Router → Service → CRUD → Database
           ↓         ↓         ↓
        (HTTP)   (Business)  (SQL)
```

**MANDATORY RULES:**
1. **Routers**: ONLY handle HTTP concerns. NEVER write SQL queries or business logic here
2. **Services**: ONLY business logic and orchestration. NEVER write SQL queries here
3. **CRUD**: ALL database queries MUST be here. NEVER put SQL in routers or services
4. **Naming**: ALWAYS use `session: SessionDep` (not `db`). Follow SQLModel conventions

### Layer Responsibilities

#### Routers (app/api/routes/)
```python
# CORRECT: Router only handles HTTP
@router.post("/", response_model=CustomerPublic)
def create_customer(
    session: SessionDep,  # ALWAYS use 'session', not 'db'
    current_user: CurrentUser,
    customer_in: CustomerCreate,
) -> Any:
    service = CustomerService(session)
    try:
        customer = service.create_customer(customer_in)
        session.commit()
        session.refresh(customer)
        return customer
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

#### Services (app/services/)
```python
# CORRECT: Service contains business logic, uses CRUD for DB
class CustomerService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_customer
    
    def create_customer(self, customer_in: CustomerCreate) -> Customer:
        # Business validation
        if self.crud.get_by_phone(self.session, phone=customer_in.phone):
            raise ValueError("Phone number already registered")
        
        # Delegate to CRUD
        return self.crud.create(self.session, obj_in=customer_in)
```

#### CRUD (app/crud/)
```python
# CORRECT: CRUD contains ALL database queries
from app.crud.base import CRUDBase

class CRUDCustomer(CRUDBase[Customer, CustomerCreate, CustomerUpdate]):
    def get_by_phone(self, session: Session, *, phone: str) -> Customer | None:
        statement = select(Customer).where(Customer.phone == phone)
        return session.exec(statement).first()

customer = CRUDCustomer(Customer)
```

### Critical Design Decisions

#### 1. NO Fake Async
```python
# WRONG: Fake async (no await inside)
async def get_report(self):  # NO!
    return self.crud.get_data()  # No await = not async

# CORRECT: Synchronous when using SQLModel
def get_report(self):
    return self.crud.get_data()

# CORRECT: Real async for background tasks
async def generate_report_task(job_id: UUID):
    await asyncio.sleep(0)  # Real async operation
```

#### 2. Permission Handling
```python
# WRONG: Permission check hidden in function body
def update_room(current_user: CurrentUser, ...):
    check_admin_or_manager(current_user)  # Hidden!

# CORRECT: Use Dependencies in decorator (visible in OpenAPI)
@router.put("/", dependencies=[Depends(require_admin_or_manager)])
def update_room(...):
    # Permission already checked by dependency
```

#### 3. Transaction Pattern
```python
# ALWAYS use this pattern:
session.add(entity)
session.flush()  # Get ID, validate constraints
log_audit(...)   # Operations in same transaction
session.commit()
session.refresh(entity)
```

#### 4. Background Tasks Session Handling
```python
# WRONG: Using request session in background task
async def bg_task(session: Session):  # Will fail!
    job = session.get(Job, id)  # Session already closed!

# CORRECT: Create new session in background task
async def bg_task(job_id: UUID):
    from app.core.db import engine
    with Session(engine) as session:
        job = session.get(Job, job_id)
        # Work with new session
```

### Validation Strategy
- **Models**: Structural validation (types, formats, regex)
- **Services**: Business validation (uniqueness, availability)
- **Routers**: Request validation and error formatting


**ALWAYS import `select` from `sqlmodel`, NOT `sqlalchemy`!**
```

### Base CRUD Pattern
```python
from typing import Generic, TypeVar
from sqlmodel import Session, SQLModel, select

ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=SQLModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=SQLModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: type[ModelType]):
        self.model = model

    def get(self, session: Session, id: UUID) -> ModelType | None:
        return session.get(self.model, id)

    def create(self, session: Session, *, obj_in: CreateSchemaType) -> ModelType:
        db_obj = self.model.model_validate(obj_in)
        session.add(db_obj)
        session.flush()
        return db_obj
```

## Key Patterns

### API Routes
- Routes are defined in `app/api/routes/`
- Use dependency injection for auth: `current_user: CurrentUser`
- Return proper HTTP status codes
- Use Pydantic models for request/response validation
- NEVER write SQL queries directly in routes

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

### Testing Philosophy

#### Core Principle: Tests Must Respect Architecture Layers
Tests should validate behavior at their specific abstraction level without bypassing layers:

```
API Tests       → Test complete workflows via HTTP
Service Tests   → Test business logic with mocked dependencies  
CRUD Tests      → Test database operations directly
```

#### Testing Guidelines

1. **API Integration Tests** - Test the full stack through endpoints:
```python
def test_create_booking_api(client, headers):
    # Create ALL data via API
    customer = client.post("/customers/", json=customer_data, headers=headers)
    room = client.post("/rooms/", json=room_data, headers=headers)
    
    # Test the operation
    booking_data = {
        "customer_id": customer.json()["id"],
        "room_id": room.json()["id"],
        "total_amount": room.json()["price_per_night"] * nights  # Calculate!
    }
    response = client.post("/bookings/", json=booking_data, headers=headers)
    
    # Verify via API
    assert response.status_code == 200
    stats = client.get(f"/customers/{customer.json()['id']}", headers=headers)
    assert stats.json()["total_bookings"] == 1
```

2. **Service Unit Tests** - Test business logic in isolation:
```python
def test_booking_service_logic():
    # Mock all dependencies
    mock_crud = Mock()
    mock_crud.get_room.return_value = Room(status="available")
    
    # Test business logic
    service = BookingService(session=Mock(), crud=mock_crud)
    result = service.can_book_room(room_id)
    
    # Verify logic, not database
    assert result == True
    mock_crud.get_room.assert_called_once()
```

3. **CRUD Unit Tests** - Test database operations:
```python
def test_crud_get_by_phone(db_session):
    # Direct database operations
    customer = Customer(phone="+1234567890")
    db_session.add(customer)
    db_session.commit()
    
    # Test CRUD method
    result = crud_customer.get_by_phone(db_session, phone="+1234567890")
    
    # Verify database state
    assert result.id == customer.id
```

#### Common Anti-Patterns to Avoid

❌ **Mixing abstraction levels**:
```python
# WRONG: Factory creates in DB, test via API
booking = BookingFactory.create(db)  # Direct DB
response = client.get(f"/bookings/{booking.id}")  # API call
```

❌ **Random test data**:
```python
# WRONG: Unpredictable values
room = Room(price=random.randint(50, 500))
```

❌ **Bypassing business logic in factories**:
```python
# WRONG: Factory skips service layer
BookingFactory.create(db)  # No stats update, no audit log
```

#### Testing New Features
**IMPORTANT**: After implementing new functionality that works correctly, always ask the user:
> "The feature is working. Would you like me to add tests for this functionality?"

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
- **ALWAYS follow the Router → Service → CRUD architecture pattern**
- **NEVER put SQL queries in routers or services - only in CRUD layer**
- **ALWAYS use `session: SessionDep` naming (not `db`)**
- **NEVER use fake async** - remove `async` if there's no `await`
- **ALWAYS use permission Dependencies in decorators** (not in function body)
- Follow existing code patterns and conventions
- Add type hints to all functions
- **ASK about tests** - After new features work, ask if tests should be added
- Check that ruff and mypy pass before committing
- **🔴 COMMIT after significant changes** - Don't forget to commit when you finish a feature or fix
- **Update documentation** - When adding new endpoints, models, or features:
  - Update this CLAUDE.md with new patterns/examples
  - Document new API endpoints and their usage
  - Add database schema changes to the models section

## Common Architecture Mistakes to Avoid

### ❌ WRONG: SQL in Router
```python
# NEVER do this in a router!
@router.get("/customers")
def get_customers(session: SessionDep):
    return session.exec(select(Customer)).all()  # NO!
```

### ❌ WRONG: SQL in Service
```python
# NEVER do this in a service!
class CustomerService:
    def get_all(self):
        return self.session.exec(select(Customer)).all()  # NO!
```

### ❌ WRONG: Business Logic in Router
```python
# NEVER do this in a router!
@router.post("/bookings")
def create_booking(...):
    if room.status != "available":  # Business logic in router!
        raise HTTPException(...)
```

### ✅ CORRECT: Proper Separation
```python
# Router: HTTP only
@router.post("/bookings")
def create_booking(session: SessionDep, booking_in: BookingCreate):
    service = BookingService(session)
    try:
        return service.create_booking(booking_in)
    except ValueError as e:
        raise HTTPException(400, str(e))

# Service: Business logic
class BookingService:
    def create_booking(self, booking_in: BookingCreate):
        room = self.crud_room.get(self.session, booking_in.room_id)
        if room.status != "available":  # Business logic here!
            raise ValueError("Room not available")
        return self.crud_booking.create(self.session, booking_in)

# CRUD: Database queries
class CRUDBooking(CRUDBase):
    def create(self, session: Session, obj_in: BookingCreate):
        booking = Booking.model_validate(obj_in)
        session.add(booking)
        session.flush()
        return booking
```