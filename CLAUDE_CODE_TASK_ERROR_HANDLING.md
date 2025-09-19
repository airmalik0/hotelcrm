# Task: Implement Domain-Specific Error Handling

## CRITICAL CONTEXT FOR CLAUDE CODE
You are implementing a production error handling system. This is NOT a prototype. Think carefully about each change as it affects the entire application.

## Current Problem
The backend currently catches ALL `ValueError` exceptions globally and returns HTTP 400. This is dangerous because:
1. Unintended ValueErrors (like `int("abc")`) become API responses
2. Services use `ValueError("phone: Message")` knowing about HTTP format
3. Wrong HTTP codes (404 should be for "not found", not 400)

## Your Task

### Step 1: Create Domain Exceptions File

**IMPORTANT**: Create exactly this file with complete implementation, not just stubs:

**File**: `backend/app/core/exceptions.py`

```python
"""
Domain-specific exceptions for business logic.
These replace generic ValueError throughout the application.
"""

class DomainError(Exception):
    """Base class for all domain exceptions."""
    pass


class NotFoundError(DomainError):
    """Resource not found. Maps to HTTP 404."""
    def __init__(self, resource: str, identifier: str = None):
        self.resource = resource
        self.identifier = identifier
        if identifier:
            message = f"{resource} with id {identifier} not found"
        else:
            message = f"{resource} not found"
        super().__init__(message)


class AlreadyExistsError(DomainError):
    """Resource already exists. Maps to HTTP 409."""
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(message)


class BusinessRuleViolation(DomainError):
    """Business rule violated. Maps to HTTP 400."""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(message)
```

### Step 2: Update app/main.py

1. Import the new exceptions from `app.core.exceptions`
2. Remove the existing `@app.exception_handler(ValueError)` handler
3. Add handlers for each domain exception:
   - `NotFoundError` → 404 response
   - `AlreadyExistsError` → 409 with field/message in errors array
   - `BusinessRuleViolation` → 400 (with optional field)
4. Keep existing handlers for `RequestValidationError`, `IntegrityError`, `ConcurrentUpdateError`

### Step 3: Update Services (Priority Order)

#### 3.1 CustomerService (`backend/app/services/customer.py`)
Replace all `ValueError` with appropriate domain exceptions:
- "Customer not found" → `NotFoundError("Customer", customer_id)`
- "Phone already registered" → `AlreadyExistsError("phone", "Phone number already registered")`
- "Cannot delete customer with bookings" → `BusinessRuleViolation("Cannot delete customer with X bookings")`

#### 3.2 BookingService (`backend/app/services/booking.py`)
- "Customer not found" → `NotFoundError("Customer", customer_id)`
- "Room not found" → `NotFoundError("Room", room_id)`
- "Room not available for dates" → `BusinessRuleViolation("Room not available", field="dates")`
- Check-in/check-out violations → `BusinessRuleViolation(message)`

#### 3.3 RoomService (`backend/app/services/room.py`)
- "Room number already exists" → `AlreadyExistsError("room_number", "Room number already exists")`
- "Cannot delete room with bookings" → `BusinessRuleViolation("Cannot delete room with existing bookings")`

#### 3.4 UserService (`backend/app/services/user.py`)
- "Username already exists" → `AlreadyExistsError("username", "Username already exists")`
- "Incorrect password" → `BusinessRuleViolation("Incorrect password", field="password")`
- "New password same as current" → `BusinessRuleViolation("New password cannot be the same", field="new_password")`

### Step 4: Clean Routes

Remove any remaining `try/except ValueError` blocks from:
- `backend/app/api/routes/customers.py`
- `backend/app/api/routes/bookings.py`
- `backend/app/api/routes/rooms.py`
- `backend/app/api/routes/users.py`

The exceptions will be handled by the global handlers.

### Step 5: Test the Changes

After implementation:
1. Restart backend: `docker compose restart backend`
2. Test each error case:
   - Create duplicate customer (should return 409 with field)
   - Get non-existent customer (should return 404)
   - Create booking with invalid room (should return 404)
   - Delete customer with bookings (should return 400)

### Step 6: Verify Frontend Compatibility

The frontend already expects this format:
```typescript
{
  detail: string
  errors?: Array<{
    field: string
    message: string
    type: string
  }>
}
```

Ensure all error responses match this structure.

## Important Notes

1. **DO NOT** use generic `ValueError` anywhere in services
2. **DO NOT** put try/except in route handlers (let global handlers catch)
3. **ALWAYS** import domain exceptions from `app.core.exceptions`
4. **PRESERVE** the existing error response format for frontend compatibility
5. **TEST** each change incrementally - don't break everything at once

## Expected Outcome

After completion:
- All services use semantic exceptions
- HTTP status codes match error types (404 for not found, 409 for duplicates)
- Frontend continues to work without changes
- Code is more explicit and maintainable

## Files to Modify

1. Create: `backend/app/core/exceptions.py`
2. Modify: `backend/app/main.py`
3. Modify: `backend/app/services/customer.py`
4. Modify: `backend/app/services/booking.py`
5. Modify: `backend/app/services/room.py`
6. Modify: `backend/app/services/user.py`
7. Clean: `backend/app/api/routes/*.py` (remove try/except)

## Validation Checklist

- [ ] Domain exceptions created
- [ ] Exception handlers added to main.py
- [ ] ValueError handler removed
- [ ] CustomerService updated
- [ ] BookingService updated
- [ ] RoomService updated
- [ ] UserService updated
- [ ] Routes cleaned from try/except
- [ ] Backend restarts without errors
- [ ] All error cases return correct HTTP status
- [ ] Frontend still works correctly

## Testing Commands for Verification

```bash
# Test 404 - Get non-existent customer
curl -X GET http://localhost:8000/api/v1/customers/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return 404 with "Customer with id ... not found"

# Test 409 - Create duplicate customer
curl -X POST http://localhost:8000/api/v1/customers/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"first_name": "Test", "last_name": "User", "phone": "+998912345678"}'
# Second request should return 409 with field "phone"

# Test 400 - Business rule violation
curl -X DELETE http://localhost:8000/api/v1/customers/CUSTOMER_WITH_BOOKINGS_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return 400 with "Cannot delete customer with X bookings"
```

## If Something Breaks

1. Check docker logs: `docker logs hotelcrm-backend-1 --tail 50`
2. Verify exception handler syntax in main.py
3. Ensure all imports are correct
4. Test with curl to see exact error format
5. If critical issue: revert changes and add back ValueError handler temporarily

## IMPORTANT REMINDERS FOR CLAUDE CODE

1. **You MUST complete ALL steps** - partial implementation will break the app
2. **Test after each service update** - don't update everything then test
3. **The frontend expects specific format** - check error response structure
4. **Remove the ValueError handler** - keeping it defeats the purpose
5. **Think about each change** - this is production code