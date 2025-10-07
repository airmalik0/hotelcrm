# (Archived) Testing Docs

## API Factories Ideology

API Factories are specialized test utilities designed to create test data through HTTP API endpoints, ensuring all business logic is properly executed.

### Core Principles of API Factories

1. **Single Responsibility**: Factories ONLY create test data via POST endpoints
2. **Happy Path Only**: Factories create valid, working data - never invalid states
3. **No Business Logic Testing**: Factories prepare data, tests verify behavior
4. **Deterministic Data**: Use counters for predictable, unique values

### What Belongs in Factories

✅ **DO include:**
- Creation methods via POST endpoints (`create_customer`, `create_room`)
- State preparation methods (`create_checked_in_booking`, `create_loyal_customer`)
- Essential utilities (`get_next_room_number`, `assert_success`)
- Complex setup scenarios (`create_customer_with_history`)

❌ **DON'T include:**
- Simple UPDATE/DELETE operations (unless part of state preparation)
- GET operations (except for polling async operations)
- Business logic verification methods
- Error scenario creation methods
- Test assertions beyond basic success checks

### What Belongs in Tests

Tests should contain:
- Business logic verification
- Error scenarios and edge cases
- Validation of side effects
- Complex workflow testing
- All assertions about business rules

### Factory Usage Example

```python
# FACTORY: Only creates data
customer = APICustomerFactory.create_loyal_customer(
    client, headers, 
    bookings_count=5
)

# TEST: Verifies business logic
def test_loyal_customer_gets_discount():
    customer = APICustomerFactory.create_loyal_customer(bookings_count=5)
    
    # Test makes the API call
    booking = client.post("/bookings/", json={...})
    
    # Test verifies business rule
    assert booking.json()["discount"] == 10
    
    # Use helper for common verifications
    APITestHelper.verify_customer_stats(
        client, headers, customer["id"], 
        expected_bookings=6, expected_spent=1000.0
    )
```

### Directory Structure
```
tests/
├── api_factories/       # Data creation via API
│   ├── base.py         # Base factory with utilities
│   ├── customer.py     # Customer creation
│   ├── room.py         # Room creation
│   ├── booking.py      # Booking creation
│   └── user.py         # User creation & auth
├── helpers/            # Test utilities
│   └── api_helpers.py  # Response validation & verification
└── api/routes/         # Actual tests
    ├── test_customers.py
    ├── test_bookings.py
    └── test_rooms.py
```

## Core Testing Principles

### 1. Single Level of Abstraction Principle
**Each test should operate at ONE abstraction level only:**

- **API Integration Tests**: Test ONLY through HTTP endpoints
  - Create ALL test data via API calls
  - Verify results via API responses
  - Never access database directly
  
- **Service Unit Tests**: Test business logic in isolation
  - Mock all external dependencies (CRUD, external APIs)
  - Test only business rules and orchestration
  - Never make actual database calls
  
- **CRUD Unit Tests**: Test database operations
  - Use in-memory database or test database
  - Test SQL queries and data persistence
  - Never include business logic

### 2. Test Isolation Hierarchy

```
API Tests (End-to-End)
    ↓ Uses real
Service Tests (Integration) 
    ↓ Uses real
CRUD Tests (Unit)
    ↓ Uses real
Database
```

**Key Rule**: Tests at each level should NEVER bypass the layer they're testing.

### 3. Factory Pattern Guidelines

#### ❌ WRONG: Factories that bypass business logic
```python
class BookingFactory:
    @staticmethod
    def create_booking(db):
        # Creates booking directly in DB
        booking = Booking(...)
        db.add(booking)
        db.commit()
        # Problem: Skips business validation, stats update, audit logs
        return booking
```

#### ✅ CORRECT: Factories that use appropriate layer
```python
class BookingFactory:
    @staticmethod
    def create_booking_via_api(client, headers):
        # Creates booking through API
        response = client.post("/bookings/", json=data, headers=headers)
        return response.json()
    
    @staticmethod
    def create_booking_via_service(session):
        # Uses service layer
        service = BookingService(session)
        return service.create_booking(data)
```

### 4. Data Determinism

**All test data must be predictable:**

```python
# ❌ WRONG: Random data breaks assertions
room = Room(price=random.randint(50, 500))
booking_data = {"total_amount": 200.0}  # Will fail validation

# ✅ CORRECT: Fixed or calculated data
room = Room(price=100.0)
nights = 2
booking_data = {"total_amount": room.price * nights}  # Always correct
```

### 5. Test Categories

#### API Integration Tests
- **Purpose**: Verify complete user workflows
- **Scope**: Full stack (Router → Service → CRUD → DB)
- **Data Creation**: Only via API endpoints
- **Assertions**: On HTTP responses and status codes

#### Service Unit Tests  
- **Purpose**: Verify business logic
- **Scope**: Service layer only
- **Dependencies**: All mocked (CRUD, external services)
- **Assertions**: On return values and exception handling

#### CRUD Unit Tests
- **Purpose**: Verify database operations
- **Scope**: CRUD layer only
- **Database**: Test database or in-memory
- **Assertions**: On database state and query results

## Architecture Patterns

### Transaction Management
**Problem**: Helper functions (audit, stats) doing commits break test transactions
**Solution**: Call all helper functions BEFORE the main commit
```python
# ❌ BAD: Multiple commits
def create_entity(db, data):
    entity = Entity(**data)
    db.add(entity)
    db.commit()  # First commit
    log_audit(db, ...)  # Has its own commit inside
    
# ✅ GOOD: Single transaction
def create_entity(db, data):
    entity = Entity(**data)
    db.add(entity)
    db.flush()  # Get ID without committing
    log_audit(db, ...)  # No commit inside
    db.commit()  # Single commit for everything
```

### Test Isolation
**Problem**: ROLLBACK doesn't undo sequences, DDL operations, or committed data
**Solution**: Clean slate approach - DELETE all data after each test
```python
@pytest.fixture
def db(engine):
    with Session(engine) as session:
        init_db(session)  # Create admin user
        yield session
        session.rollback()  # Rollback uncommitted
        # Clean ALL data including users
        session.execute(delete(AuditLog))
        session.execute(delete(Booking))
        session.execute(delete(User))
        session.commit()
```

## Testing Patterns

### Factory Pattern for Test Data
Create dedicated factory classes for consistent test data:
```python
class UserFactory:
    @staticmethod
    def create_admin_user(db, username=None):
        return create_user(db, role=ADMIN, ...)
    
    @staticmethod
    def create_host_user(db, username=None):
        return create_user(db, role=HOST, ...)
```

### RBAC Testing with Fixture Composition
Test each endpoint with different permission levels:
```python
def test_create_resource_as_admin(admin_headers):
    response = client.post("/resource", headers=admin_headers)
    assert response.status_code == 200

def test_create_resource_as_host_forbidden(host_headers):
    response = client.post("/resource", headers=host_headers)
    assert response.status_code == 403
```

### Test Organization
Group tests by operation type for clarity:
```python
class TestResourceCreate:
    def test_create_success(self): ...
    def test_create_duplicate(self): ...
    
class TestResourcePermissions:
    def test_admin_access(self): ...
    def test_host_denied(self): ...
```

## Common Pitfalls to Avoid

### 1. Imaginary Fields
Always read actual models before writing tests
```python
# ❌ BAD: Assuming fields exist
data = {"name": "Test", "capacity": 10}  # capacity might not exist!

# ✅ GOOD: Check model first
# First: Read Room model in models.py
# Then: Use only existing fields
```

### 2. Wrong Business Logic
Understand actual constraints
```python
# ❌ BAD: Testing impossible scenarios
book_occupied_room()  # Can't book OCCUPIED rooms!

# ✅ GOOD: Test real business rules
book_available_room()  # Only AVAILABLE can be booked
```

### 3. Serialization Issues
Handle special types
```python
def serialize_for_json(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, Decimal):
        return float(obj)
```

### 4. Permission Checks
Don't hardcode error messages
```python
# ❌ BAD: Exact message matching
assert response.json()["detail"] == "Only admin can access"

# ✅ GOOD: Flexible matching
assert "admin" in response.json()["detail"].lower()
```

## Testing Methodology

1. **Read First, Test Second**: Always understand existing code before testing
2. **Test What Exists**: Don't test imaginary features
3. **Verify Both Sides**: Check API response AND database state
4. **Edge Cases Matter**: Test overlapping dates, buffer times, state transitions
5. **Clean State**: Each test must start from zero, no dependencies

## Quick Checklist for New Tests

- [ ] Read the model definition first
- [ ] Read the API endpoint implementation
- [ ] Create test data using factories
- [ ] Test happy path first
- [ ] Add edge cases
- [ ] Test all permission levels
- [ ] Verify database state, not just API response
- [ ] Ensure proper cleanup

## Внимание
Pytest и связанные скрипты выключены в текущем проекте. Документ оставлен для справки.

## Test Database

### Database Configuration

- **Test database name**: `test_app` (production uses `app`)
- **Connection in Docker**: `postgresql://postgres:PASSWORD@db/test_app`
- **Connection from host**: `postgresql://postgres:PASSWORD@localhost:5433/test_app`

### Test Isolation

1. **Session-level**: Tables created at start, dropped at end
2. **Function-level**: Each test runs in transaction that rolls back
3. **Data cleanup**: All data deleted after each test
4. **Admin user**: Recreated for each test via `init_db()`

### Database States

```
Before Test Suite → Create test_app database
Before Each Test  → Begin transaction, create admin user
During Test       → All operations in transaction
After Each Test   → Rollback transaction, delete all data
After Test Suite  → Drop all tables
```