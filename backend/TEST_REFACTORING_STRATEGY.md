# Test Suite Refactoring Strategy

## Core Principle: Tests Must Follow Clean Architecture

```
API Tests → Router (HTTP) → Service (Business) → CRUD (Database)
             ↓                ↓                    ↓
         Status Codes    Business Rules      Data Persistence
```

## Layer Testing Strategy

### 1. API Integration Tests (test_*.py in api/routes/)
**Purpose**: Test the full stack integration
**What to test**:
- HTTP status codes
- Response structure
- Permission checks
- End-to-end workflows

**What NOT to test**:
- Direct database state (use API responses)
- Implementation details
- Internal service logic

**Pattern**:
```python
def test_create_customer(client, auth_headers):
    # Arrange
    data = {"name": "Test"}
    
    # Act
    response = client.post("/customers/", json=data, headers=auth_headers)
    
    # Assert API response only
    assert response.status_code == 200
    assert response.json()["name"] == "Test"
    # NO database checks here!
```

### 2. Service Unit Tests (NEW: test_services/)
**Purpose**: Test business logic in isolation
**What to test**:
- Business rules
- Validation logic
- Orchestration between CRUD operations
- Error handling

**Pattern**:
```python
def test_service_business_logic():
    # Mock CRUD layer
    mock_crud = Mock()
    mock_crud.get_by_phone.return_value = None
    
    # Test service
    service = CustomerService(session=Mock())
    service.crud = mock_crud
    
    # Verify business logic
    result = service.create_customer(data)
    mock_crud.create.assert_called_once()
```

### 3. CRUD Unit Tests (NEW: test_crud/)
**Purpose**: Test database operations
**What to test**:
- SQL query correctness
- Data persistence
- Filtering and pagination
- Relationships

**Pattern**:
```python
def test_crud_create(db_session):
    # Direct CRUD testing
    crud_customer = CRUDCustomer(Customer)
    
    # Test CRUD operation
    customer = crud_customer.create(db_session, obj_in=data)
    
    # Verify in database
    assert db_session.get(Customer, customer.id) is not None
```

## Factory Refactoring Rules

### BEFORE (Wrong):
```python
class CustomerFactory:
    def create_test_customer(session):
        # WRONG: Direct model creation
        customer = Customer(...)
        # WRONG: Business logic in factory
        customer.total_bookings += 1
        session.add(customer)
        session.commit()
```

### AFTER (Correct):
```python
class CustomerFactory:
    @staticmethod
    def build(**kwargs):
        """Build object without saving"""
        return CustomerCreate(**kwargs)
    
    @staticmethod
    def create(session, **kwargs):
        """Create via CRUD layer"""
        from app.crud.customer import customer as crud_customer
        data = CustomerFactory.build(**kwargs)
        return crud_customer.create(session, obj_in=data)
```

## Transaction Management

### Test Fixture Pattern:
```python
@pytest.fixture
def db_session(engine):
    """Single transaction per test"""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    # Create nested transaction for rollback
    nested = connection.begin_nested()
    
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            nested = connection.begin_nested()
    
    yield session
    
    # Rollback everything
    session.close()
    transaction.rollback()
    connection.close()
```

## Test Organization

```
tests/
├── conftest.py                    # Shared fixtures
├── factories/                     # Object factories (no business logic)
│   ├── base.py                   # Base factory class
│   ├── customer.py               # Customer factory
│   ├── room.py                  # Room factory
│   └── booking.py                # Booking factory
├── unit/                         # Unit tests
│   ├── crud/                     # CRUD layer tests
│   │   ├── test_crud_customer.py
│   │   ├── test_crud_room.py
│   │   └── test_crud_booking.py
│   └── services/                 # Service layer tests
│       ├── test_customer_service.py
│       ├── test_room_service.py
│       └── test_booking_service.py
└── api/                          # Integration tests
    └── routes/
        ├── test_customers.py
        ├── test_rooms.py
        └── test_bookings.py
```

## Assertion Guidelines

### API Tests:
```python
# GOOD: Test behavior through API
assert response.status_code == 200
assert response.json()["total"] == 100

# BAD: Don't check database directly
db.refresh(customer)  # NO!
assert customer.total == 100  # NO!
```

### Service Tests:
```python
# GOOD: Mock dependencies
mock_crud.get.return_value = None
service.process(data)
mock_crud.create.assert_called_with(...)

# BAD: Don't use real database
customer = session.query(Customer).first()  # NO!
```

### CRUD Tests:
```python
# GOOD: Test database operations
result = crud.get_by_phone(session, phone="123")
assert result.phone == "123"

# BAD: Don't test business logic
if result.discount > 0:  # NO! Business logic
    result.total = calculate_discount()  # NO!
```

## Permission Testing

### Use Dependency Pattern:
```python
# GOOD: Permission in decorator
@router.post("/", dependencies=[Depends(require_admin)])
def create_room(...):
    pass

# Test:
def test_create_room_forbidden(client, host_headers):
    response = client.post("/rooms/", headers=host_headers, json=data)
    assert response.status_code == 403
```

## Common Anti-Patterns to Avoid

1. **Testing Implementation Details**
   - BAD: `assert len(session.query(Customer).all()) == 5`
   - GOOD: `assert response.json()["count"] == 5`

2. **Multiple Commits in Test**
   - BAD: Factory commits, then test commits
   - GOOD: Single transaction, rollback at end

3. **Business Logic in Wrong Layer**
   - BAD: Validation in router, SQL in service
   - GOOD: HTTP in router, business in service, SQL in CRUD

4. **Tight Coupling**
   - BAD: Test depends on factory side effects
   - GOOD: Explicit setup in each test

5. **Missing Layer Tests**
   - BAD: Only API tests
   - GOOD: Unit tests for each layer

## Refactoring Steps

1. **Phase 1: Infrastructure**
   - Fix conftest.py transaction handling
   - Create base factory class
   - Set up test utilities

2. **Phase 2: Factories**
   - Remove business logic
   - Use CRUD layer
   - Add build() vs create() methods

3. **Phase 3: Unit Tests**
   - Add CRUD layer tests
   - Add service layer tests
   - Mock dependencies properly

4. **Phase 4: Integration Tests**
   - Remove direct SQL
   - Test through API only
   - Fix assertion patterns

5. **Phase 5: Validation**
   - Run all tests
   - Check coverage
   - Verify architecture compliance

## Success Criteria

- [ ] No direct SQL in API tests
- [ ] All factories use CRUD layer
- [ ] Service layer has unit tests
- [ ] CRUD layer has unit tests
- [ ] Single transaction per test
- [ ] Permissions use Dependencies
- [ ] Tests are independent
- [ ] No business logic in factories
- [ ] Clear layer separation
- [ ] 80%+ code coverage