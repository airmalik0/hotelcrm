# Test Refactoring - Practical Examples

## Common Anti-Patterns and Their Solutions

### Anti-Pattern 1: Direct SQL Query After API Call

#### ❌ BEFORE (test_customers.py:53)
```python
def test_create_customer(client, host_headers, db):
    data = {
        "first_name": "John",
        "last_name": "Doe", 
        "phone": "+1234567890"
    }
    response = client.post("/api/v1/customers/", headers=host_headers, json=data)
    assert response.status_code == 200
    
    # WRONG: Direct SQL query to verify
    customer = db.exec(select(Customer).where(Customer.phone == "+1234567890")).first()
    assert customer is not None
    assert customer.first_name == "John"
```

#### ✅ AFTER
```python
def test_create_customer(client, host_headers):  # Note: no 'db' parameter
    data = {
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890"
    }
    response = client.post("/api/v1/customers/", headers=host_headers, json=data)
    assert response.status_code == 200
    
    # CORRECT: Verify through API response
    content = response.json()
    assert content["first_name"] == "John"
    assert content["last_name"] == "Doe"
    assert content["phone"] == "+1234567890"
    assert "id" in content
    
    # If you need to verify persistence, use another API call
    customer_id = content["id"]
    get_response = client.get(f"/api/v1/customers/{customer_id}", headers=host_headers)
    assert get_response.status_code == 200
    assert get_response.json()["first_name"] == "John"
```

### Anti-Pattern 2: Database Refresh to Check Updates

#### ❌ BEFORE (test_customers.py:375)
```python
def test_update_customer(client, host_headers, test_customer, db):
    update_data = {
        "first_name": "Updated",
        "district": "Uptown"
    }
    response = client.put(
        f"/api/v1/customers/{test_customer.id}",
        headers=host_headers,
        json=update_data
    )
    assert response.status_code == 200
    
    # WRONG: Refresh database object
    db.refresh(test_customer)
    assert test_customer.first_name == "Updated"
    assert test_customer.district == "Uptown"
```

#### ✅ AFTER
```python
def test_update_customer(client, host_headers, test_customer):  # No 'db'
    update_data = {
        "first_name": "Updated",
        "district": "Uptown"
    }
    response = client.put(
        f"/api/v1/customers/{test_customer.id}",
        headers=host_headers,
        json=update_data
    )
    assert response.status_code == 200
    
    # CORRECT: Check the update response
    content = response.json()
    assert content["first_name"] == "Updated"
    assert content["district"] == "Uptown"
    
    # Optionally verify with GET
    get_response = client.get(
        f"/api/v1/customers/{test_customer.id}",
        headers=host_headers
    )
    assert get_response.json()["first_name"] == "Updated"
```

### Anti-Pattern 3: Checking Side Effects in Database

#### ❌ BEFORE (test_bookings.py:62-64)
```python
def test_create_booking_updates_customer_stats(client, admin_headers, test_customer, test_room, db):
    booking_data = {
        "customer_id": str(test_customer.id),
        "room_id": str(test_room.id),
        "check_in": datetime.now().isoformat(),
        "check_out": (datetime.now() + timedelta(days=2)).isoformat(),
        "total_amount": 200.0
    }
    response = client.post("/api/v1/bookings/", headers=admin_headers, json=booking_data)
    assert response.status_code == 200
    
    # WRONG: Checking side effects directly in database
    db.refresh(test_customer)
    assert test_customer.total_bookings == 1
    assert test_customer.total_spent == 200.0
```

#### ✅ AFTER
```python
def test_create_booking_updates_customer_stats(client, admin_headers, test_customer, test_room):
    booking_data = {
        "customer_id": str(test_customer.id),
        "room_id": str(test_room.id),
        "check_in": datetime.now().isoformat(),
        "check_out": (datetime.now() + timedelta(days=2)).isoformat(),
        "total_amount": 200.0
    }
    
    # Get initial customer state via API
    initial_customer = client.get(
        f"/api/v1/customers/{test_customer.id}",
        headers=admin_headers
    ).json()
    initial_bookings = initial_customer.get("total_bookings", 0)
    initial_spent = initial_customer.get("total_spent", 0.0)
    
    # Create booking
    response = client.post("/api/v1/bookings/", headers=admin_headers, json=booking_data)
    assert response.status_code == 200
    
    # CORRECT: Check side effects via API
    updated_customer = client.get(
        f"/api/v1/customers/{test_customer.id}",
        headers=admin_headers
    ).json()
    assert updated_customer["total_bookings"] == initial_bookings + 1
    assert updated_customer["total_spent"] == initial_spent + 200.0
```

### Anti-Pattern 4: Direct Model Manipulation

#### ❌ BEFORE (test_bookings.py:1047-1049)
```python
def test_check_in_with_room_reset(client, admin_headers, booking, room, db):
    # WRONG: Directly manipulating model
    room.status = RoomStatus.AVAILABLE
    db.add(room)
    db.commit()
    
    response = client.post(
        f"/api/v1/bookings/{booking.id}/check-in",
        headers=admin_headers
    )
    assert response.status_code == 200
```

#### ✅ AFTER
```python
def test_check_in_with_room_reset(client, admin_headers):
    # CORRECT: Use API to set up test state
    # Create room via API
    room_data = {"room_number": "101", "status": "AVAILABLE", "price_per_night": 100}
    room_response = client.post("/api/v1/rooms/", headers=admin_headers, json=room_data)
    room_id = room_response.json()["id"]
    
    # Create booking via API
    booking_data = {
        "room_id": room_id,
        "customer_id": customer_id,
        "check_in": datetime.now().isoformat(),
        "check_out": (datetime.now() + timedelta(days=1)).isoformat()
    }
    booking_response = client.post("/api/v1/bookings/", headers=admin_headers, json=booking_data)
    booking_id = booking_response.json()["id"]
    
    # If room status needs changing, use API
    room_update = {"status": "AVAILABLE"}
    client.put(f"/api/v1/rooms/{room_id}", headers=admin_headers, json=room_update)
    
    # Now test check-in
    response = client.post(
        f"/api/v1/bookings/{booking_id}/check-in",
        headers=admin_headers
    )
    assert response.status_code == 200
    
    # Verify room status changed via API
    room_status = client.get(f"/api/v1/rooms/{room_id}", headers=admin_headers).json()
    assert room_status["status"] == "OCCUPIED"
```

### Anti-Pattern 5: Testing Private Implementation

#### ❌ BEFORE
```python
def test_booking_with_buffer_time(client, admin_headers, room, db):
    # Create first booking directly
    booking1 = Booking(
        room_id=room.id,
        check_in=datetime.now(),
        check_out=datetime.now() + timedelta(days=1)
    )
    db.add(booking1)
    db.commit()
    
    # WRONG: Testing internal buffer logic
    from app.services.booking_service import BUFFER_MINUTES
    
    booking2_data = {
        "room_id": str(room.id),
        "check_in": (booking1.check_out + timedelta(minutes=BUFFER_MINUTES-1)).isoformat(),
        "check_out": (booking1.check_out + timedelta(days=1)).isoformat()
    }
    response = client.post("/api/v1/bookings/", headers=admin_headers, json=booking2_data)
    assert response.status_code == 400
```

#### ✅ AFTER
```python
def test_booking_requires_buffer_time(client, admin_headers):
    # CORRECT: Test behavior, not implementation
    # Create room
    room = client.post("/api/v1/rooms/", headers=admin_headers, json={
        "room_number": "101",
        "price_per_night": 100
    }).json()
    
    # Create first booking
    booking1_data = {
        "room_id": room["id"],
        "customer_id": customer_id,
        "check_in": datetime.now().isoformat(),
        "check_out": (datetime.now() + timedelta(days=1)).isoformat()
    }
    booking1 = client.post("/api/v1/bookings/", headers=admin_headers, json=booking1_data).json()
    
    # Try to create immediately adjacent booking (no buffer)
    booking2_data = {
        "room_id": room["id"],
        "customer_id": customer_id,
        "check_in": booking1["check_out"],  # Immediately after
        "check_out": (datetime.fromisoformat(booking1["check_out"]) + timedelta(days=1)).isoformat()
    }
    response = client.post("/api/v1/bookings/", headers=admin_headers, json=booking2_data)
    
    # Expect failure due to buffer requirement (but don't assume specific buffer time)
    assert response.status_code == 400
    assert "buffer" in response.json()["detail"].lower() or "gap" in response.json()["detail"].lower()
```

## Helper Functions to Create

### 1. API Response Validator
```python
# app/tests/helpers/validators.py
def assert_valid_customer(customer_data: dict):
    """Validate customer response structure"""
    required_fields = ["id", "first_name", "last_name", "phone"]
    for field in required_fields:
        assert field in customer_data, f"Missing field: {field}"
    
    # Validate types
    assert isinstance(customer_data["id"], str)
    assert isinstance(customer_data["first_name"], str)
    assert isinstance(customer_data["last_name"], str)

def assert_valid_booking(booking_data: dict):
    """Validate booking response structure"""
    required_fields = ["id", "customer_id", "room_id", "check_in", "check_out", "status"]
    for field in required_fields:
        assert field in booking_data, f"Missing field: {field}"
    
    # Validate status enum
    valid_statuses = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"]
    assert booking_data["status"] in valid_statuses
```

### 2. Test Data Builders
```python
# app/tests/helpers/builders.py
class CustomerDataBuilder:
    @staticmethod
    def build_create_data(**overrides):
        defaults = {
            "first_name": "Test",
            "last_name": "Customer",
            "phone": f"+1{random.randint(1000000000, 9999999999)}"
        }
        defaults.update(overrides)
        return defaults

class BookingDataBuilder:
    @staticmethod
    def build_create_data(customer_id, room_id, **overrides):
        check_in = datetime.now(timezone.utc)
        check_out = check_in + timedelta(days=1)
        defaults = {
            "customer_id": str(customer_id),
            "room_id": str(room_id),
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "total_amount": 100.0,
            "payment_method": "cash"
        }
        defaults.update(overrides)
        return defaults
```

### 3. API Test Client Wrapper
```python
# app/tests/helpers/api_client.py
class APITestClient:
    def __init__(self, client, headers):
        self.client = client
        self.headers = headers
    
    def create_customer(self, **kwargs):
        """Create customer and return parsed response"""
        data = CustomerDataBuilder.build_create_data(**kwargs)
        response = self.client.post("/api/v1/customers/", headers=self.headers, json=data)
        assert response.status_code == 200
        return response.json()
    
    def get_customer(self, customer_id):
        """Get customer by ID"""
        response = self.client.get(f"/api/v1/customers/{customer_id}", headers=self.headers)
        assert response.status_code == 200
        return response.json()
    
    def create_booking(self, customer_id, room_id, **kwargs):
        """Create booking and return parsed response"""
        data = BookingDataBuilder.build_create_data(customer_id, room_id, **kwargs)
        response = self.client.post("/api/v1/bookings/", headers=self.headers, json=data)
        assert response.status_code == 200
        return response.json()
```

## Usage in Tests

With these helpers, tests become much cleaner:

```python
def test_booking_workflow(client, admin_headers):
    # Setup API client
    api = APITestClient(client, admin_headers)
    
    # Create test data via API
    customer = api.create_customer(first_name="John", last_name="Doe")
    room = api.create_room(room_number="101", price_per_night=150)
    
    # Test booking creation
    booking = api.create_booking(
        customer_id=customer["id"],
        room_id=room["id"],
        total_amount=150
    )
    
    # Validate response
    assert_valid_booking(booking)
    assert booking["customer_id"] == customer["id"]
    assert booking["room_id"] == room["id"]
    
    # Check side effects via API
    updated_customer = api.get_customer(customer["id"])
    assert updated_customer["total_bookings"] == 1
    assert updated_customer["total_spent"] == 150
```

## Key Principles

1. **Never access `db` directly in API tests**
2. **Always validate through API responses**
3. **Use helper functions to reduce duplication**
4. **Test behavior, not implementation**
5. **Keep tests independent - each test sets up its own data**
6. **Use meaningful assertions that document expected behavior**

## Migration Checklist

When refactoring a test file:
- [ ] Remove `db` parameter from all test functions
- [ ] Replace all `db.exec(select(...))` with API calls
- [ ] Replace all `db.refresh()` with GET requests
- [ ] Replace all `db.add()` with POST requests
- [ ] Replace all direct model access with API responses
- [ ] Add response structure validation
- [ ] Use helper functions for common operations
- [ ] Ensure tests still pass
- [ ] Verify no database imports remain