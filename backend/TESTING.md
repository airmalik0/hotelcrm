# Testing Best Practices & Common Pitfalls

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

## Running Tests

```bash
# Run all tests
uv run python -m pytest

# Run specific test file
uv run python -m pytest app/tests/api/routes/test_users.py

# Run with coverage
uv run python -m pytest --cov=app --cov-report=term-missing

# Run in Docker (required for database access)
docker exec hotelcrm-backend-1 uv run python -m pytest
```

## Test Database

- Tests use separate database: `test_app` (vs production `app`)
- Tables created at session start, dropped at session end
- Data cleaned between each test for isolation
- Admin user recreated for each test via `init_db()`