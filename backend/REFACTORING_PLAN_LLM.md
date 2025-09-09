# Backend Architecture Refactoring - Complete LLM Execution Plan

## CURRENT PROBLEMS IN CODEBASE

The backend has severe architectural inconsistencies that need fixing:

### 1. Database Access Chaos
- **CURRENT**: Some routers directly use `session.exec()`, others use CRUD, others use services
- **PROBLEM**: No single source of truth for database operations
- **SOLUTION**: ALL database queries must go through CRUD layer only

### 2. Fake Async Everywhere  
- **CURRENT**: Services have `async def` methods but NO `await` inside (example: `AnalyticsService.get_occupancy_report`)
- **PROBLEM**: Misleading code, no performance benefit, just confusion
- **SOLUTION**: Remove all `async` from services since we use synchronous SQLModel

### 3. Inconsistent Naming
- **CURRENT**: Mixed usage - some files use `session: SessionDep`, others use `db: SessionDep`
- **PROBLEM**: Confusing and inconsistent
- **SOLUTION**: Use `session` everywhere (SQLModel convention)

### 4. Permission Checking Mess
- **CURRENT**: Three different patterns mixed randomly:
  - Inside function: `check_admin_or_manager(current_user)`
  - As dependency: `Depends(get_current_admin_user)`  
  - Direct check: `if current_user.role != UserRole.ADMIN`
- **PROBLEM**: Inconsistent, not visible in OpenAPI docs
- **SOLUTION**: Use Dependencies in decorators for all permission checks

### 5. Service Layer Problems
- **CURRENT**: Services contain raw SQL queries (see `AnalyticsService` with 500+ lines of SQL)
- **PROBLEM**: Violates separation of concerns, hard to test
- **SOLUTION**: Services = business logic only, CRUD = all SQL

### 6. Transaction Pattern Chaos
- **CURRENT**: Three different patterns used randomly
- **PROBLEM**: Inconsistent behavior, potential data integrity issues
- **SOLUTION**: Standard pattern everywhere: `add() → flush() → commit() → refresh()`

## TARGET ARCHITECTURE

```
Request → Router → Service → CRUD → Database
           ↓         ↓         ↓
        (HTTP)   (Business)  (SQL)
```

- **Routers**: HTTP handling, request validation, calling services
- **Services**: Business logic, orchestration, NO SQL
- **CRUD**: ALL database queries, returns models
- **Models**: Data structures and validation

## CRITICAL DECISIONS FOR REFACTORING

1. **Remove ALL fake async**: Services will be synchronous (no `async def` without real `await`)
2. **Rename ALL `db` to `session`**: Consistency with SQLModel docs
3. **SQL only in CRUD layer**: Services must NEVER contain database queries
4. **Permissions via Dependencies**: All permission checks in router decorators
5. **Background tasks stay async**: Only for report generation

## EXECUTION STEPS

### STEP 1: Create Base CRUD Infrastructure

**WHY**: Currently each entity has different database access patterns. We need a single base class to ensure consistency.

**WHAT TO DO**: Create the foundation for all CRUD operations.

Create file `/home/malik/hotelcrm/backend/app/crud/base.py`:
```python
from typing import Any, Generic, TypeVar
from uuid import UUID
from sqlmodel import Session, SQLModel, select
from fastapi import HTTPException

ModelType = TypeVar("ModelType", bound=SQLModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=SQLModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=SQLModel)

class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: type[ModelType]):
        self.model = model

    def get(self, session: Session, id: UUID) -> ModelType | None:
        return session.get(self.model, id)

    def get_multi(
        self, session: Session, *, skip: int = 0, limit: int = 100
    ) -> list[ModelType]:
        statement = select(self.model).offset(skip).limit(limit)
        return session.exec(statement).all()

    def create(self, session: Session, *, obj_in: CreateSchemaType) -> ModelType:
        db_obj = self.model.model_validate(obj_in)
        session.add(db_obj)
        session.flush()
        return db_obj

    def update(
        self, session: Session, *, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        update_data = obj_in.model_dump(exclude_unset=True)
        db_obj.sqlmodel_update(update_data)
        session.add(db_obj)
        session.flush()
        return db_obj

    def delete(self, session: Session, *, id: UUID) -> ModelType:
        obj = session.get(self.model, id)
        if obj:
            session.delete(obj)
            session.flush()
        return obj

    def count(self, session: Session) -> int:
        from sqlmodel import func
        statement = select(func.count()).select_from(self.model)
        return session.exec(statement).one()
```

### STEP 2: Fix ALL Services - Remove Fake Async

**WHY**: Services are marked `async def` but contain NO `await` statements. This is "fake async" that:
- Misleads developers into thinking operations are non-blocking
- Adds overhead without benefit
- Makes debugging harder
- Cannot be properly tested with async tools

**HOW TO IDENTIFY**: Look for `async def` methods that have no `await` inside their body.

**WHAT TO DO**: Remove `async` keyword from all service methods and rename `db` to `session`.

#### Fix `/home/malik/hotelcrm/backend/app/services/analytics_service.py`:

FIND:
```python
class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    async def get_occupancy_report(
```

REPLACE WITH:
```python
class AnalyticsService:
    def __init__(self, session: Session):
        self.session = session

    def get_occupancy_report(
```

Then replace ALL occurrences in this file:
- `self.db` → `self.session`
- `async def` → `def` (remove async from all methods)

#### Fix `/home/malik/hotelcrm/backend/app/services/import_service.py`:

FIND:
```python
class ImportService:
    def __init__(self, db: Session):
        self.db = db
```

REPLACE WITH:
```python
class ImportService:
    def __init__(self, session: Session):
        self.session = session
```

Then replace ALL:
- `self.db` → `self.session`
- `async def` → `def`

#### Fix ALL other services in `/home/malik/hotelcrm/backend/app/services/`:
- `chart_service.py`: Remove all `async def`, make them `def`
- `export_service.py`: Remove all `async def`, make them `def`
- `pdf_service.py`: Remove all `async def`, make them `def`

### STEP 3: Create CRUD for Analytics (Move SQL from Service)

**WHY**: `AnalyticsService` currently contains 500+ lines of SQL queries mixed with business logic. This violates separation of concerns - services should orchestrate, not query databases.

**CURRENT PROBLEM**:
```python
# BAD - SQL in service:
class AnalyticsService:
    def get_occupancy_report(self):
        query = select(...).where(...)  # SQL in service!
        results = self.db.exec(query).all()  # Direct DB access!
```

**WHAT TO DO**: Extract ALL SQL queries from services into dedicated CRUD classes.

Create file `/home/malik/hotelcrm/backend/app/crud/analytics.py`:
```python
from datetime import datetime
from typing import Any
from sqlalchemy import func, select, case
from sqlmodel import Session
from app.models import Booking, BookingStatus, Customer, Room, RoomType

class CRUDAnalytics:
    def __init__(self, session: Session):
        self.session = session

    def get_period_expression(self, group_by: str) -> Any:
        """Return SQL expression for grouping by time period."""
        if group_by == "hour":
            return func.date_trunc("hour", Booking.check_in)
        elif group_by == "day":
            return func.date_trunc("day", Booking.check_in)
        elif group_by == "week":
            return func.date_trunc("week", Booking.check_in)
        elif group_by == "month":
            return func.date_trunc("month", Booking.check_in)
        elif group_by == "year":
            return func.date_trunc("year", Booking.check_in)
        else:
            return func.date_trunc("day", Booking.check_in)

    def get_occupancy_data(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
        room_id: str | None = None,
        group_by: str = "day"
    ) -> list[Any]:
        """Get raw occupancy data from database."""
        period_expr = self.get_period_expression(group_by)
        
        query = (
            select(
                period_expr.label("period"),
                func.count(func.distinct(Booking.id)).label("total_bookings"),
                func.count(func.distinct(Room.id)).label("unique_rooms"),
            )
            .select_from(Booking)
            .join(Room)
            .where(
                Booking.check_in >= start_date,
                Booking.check_out <= end_date,
                Booking.status != BookingStatus.CANCELLED,
            )
        )

        if room_type and room_type != "all":
            room_type_enum = RoomType.STANDARD if room_type == "standard" else RoomType.VIP
            query = query.where(Room.room_type == room_type_enum)

        if room_id:
            query = query.where(Room.id == room_id)

        query = query.group_by(period_expr).order_by(period_expr)
        return self.session.exec(query).all()

    def get_total_rooms(self, room_type: str | None = None, room_id: str | None = None) -> int:
        """Get total room count with filters."""
        query = select(func.count(Room.id)).select_from(Room)
        
        if room_type and room_type != "all":
            room_type_enum = RoomType.STANDARD if room_type == "standard" else RoomType.VIP
            query = query.where(Room.room_type == room_type_enum)
        
        if room_id:
            query = query.where(Room.id == room_id)
        
        result = self.session.exec(query).first()
        return result[0] if result else 1

    # Move ALL other SQL queries here from AnalyticsService
```

Then update `/home/malik/hotelcrm/backend/app/services/analytics_service.py`:
```python
from app.crud.analytics import CRUDAnalytics

class AnalyticsService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = CRUDAnalytics(session)

    def get_occupancy_report(
        self,
        start_date: datetime,
        end_date: datetime,
        room_type: str | None = None,
        room_id: str | None = None,
        group_by: str = "day",
    ) -> list[dict[str, Any]]:
        """Get occupancy report - business logic only, no SQL."""
        # Get data from CRUD
        results = self.crud.get_occupancy_data(
            start_date, end_date, room_type, room_id, group_by
        )
        total_rooms = self.crud.get_total_rooms(room_type, room_id)
        
        # Format results (business logic)
        formatted_results = []
        for row in results:
            period_date = row[0]
            total_bookings = row[1]
            unique_rooms = row[2]
            occupancy_rate = (unique_rooms / total_rooms * 100) if total_rooms > 0 else 0
            
            formatted_results.append({
                "period": period_date.isoformat(),
                "period_label": self._format_period_label(period_date, group_by),
                "total_bookings": total_bookings,
                "unique_rooms": unique_rooms,
                "total_rooms": total_rooms,
                "occupancy_rate": round(occupancy_rate, 2),
            })
        
        return formatted_results
```

### STEP 4: Create Missing CRUD Classes

Create `/home/malik/hotelcrm/backend/app/crud/customer.py`:
```python
from uuid import UUID
from sqlmodel import Session, select, or_, col, func
from app.crud.base import CRUDBase
from app.models import Customer, CustomerCreate, CustomerUpdate

class CRUDCustomer(CRUDBase[Customer, CustomerCreate, CustomerUpdate]):
    def get_by_phone(self, session: Session, *, phone: str) -> Customer | None:
        statement = select(Customer).where(Customer.phone == phone)
        return session.exec(statement).first()
    
    def get_multi_with_search(
        self, session: Session, *, skip: int = 0, limit: int = 100, search: str | None = None
    ) -> list[Customer]:
        statement = select(Customer)
        
        if search:
            search_filter = or_(
                col(Customer.first_name).ilike(f"%{search}%"),
                col(Customer.last_name).ilike(f"%{search}%"),
                col(Customer.phone).ilike(f"%{search}%"),
            )
            statement = statement.where(search_filter)
        
        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()
    
    def count_with_search(self, session: Session, *, search: str | None = None) -> int:
        statement = select(func.count()).select_from(Customer)
        
        if search:
            search_filter = or_(
                col(Customer.first_name).ilike(f"%{search}%"),
                col(Customer.last_name).ilike(f"%{search}%"),
                col(Customer.phone).ilike(f"%{search}%"),
            )
            statement = statement.where(search_filter)
        
        return session.exec(statement).one()

customer = CRUDCustomer(Customer)
```

Create `/home/malik/hotelcrm/backend/app/crud/room.py`:
```python
from uuid import UUID
from sqlmodel import Session, select, func
from app.crud.base import CRUDBase
from app.models import Room, RoomCreate, RoomUpdate, RoomStatus

class CRUDRoom(CRUDBase[Room, RoomCreate, RoomUpdate]):
    def get_by_room_number(self, session: Session, *, room_number: str) -> Room | None:
        statement = select(Room).where(Room.room_number == room_number)
        return session.exec(statement).first()
    
    def get_available(
        self, session: Session, *, skip: int = 0, limit: int = 100
    ) -> list[Room]:
        statement = (
            select(Room)
            .where(Room.status == RoomStatus.AVAILABLE)
            .offset(skip)
            .limit(limit)
        )
        return session.exec(statement).all()
    
    def count_available(self, session: Session) -> int:
        statement = select(func.count()).select_from(Room).where(
            Room.status == RoomStatus.AVAILABLE
        )
        return session.exec(statement).one()

room = CRUDRoom(Room)
```

Create `/home/malik/hotelcrm/backend/app/crud/booking.py`:
```python
from datetime import datetime, timedelta
from uuid import UUID
from sqlmodel import Session, select, and_, func
from sqlalchemy.orm import joinedload
from app.crud.base import CRUDBase
from app.models import Booking, BookingCreate, BookingUpdate, BookingStatus

class CRUDBooking(CRUDBase[Booking, BookingCreate, BookingUpdate]):
    def get_with_relations(self, session: Session, *, booking_id: UUID) -> Booking | None:
        statement = (
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                joinedload(Booking.customer),  # type: ignore[arg-type]
                joinedload(Booking.room)  # type: ignore[arg-type]
            )
        )
        return session.exec(statement).first()
    
    def get_multi_filtered(
        self,
        session: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        status: BookingStatus | None = None,
        room_id: UUID | None = None,
        customer_id: UUID | None = None
    ) -> list[Booking]:
        statement = select(Booking)
        
        if status:
            statement = statement.where(Booking.status == status)
        if room_id:
            statement = statement.where(Booking.room_id == room_id)
        if customer_id:
            statement = statement.where(Booking.customer_id == customer_id)
        
        statement = statement.options(
            joinedload(Booking.customer),  # type: ignore[arg-type]
            joinedload(Booking.room)  # type: ignore[arg-type]
        )
        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()
    
    def count_filtered(
        self,
        session: Session,
        *,
        status: BookingStatus | None = None,
        room_id: UUID | None = None,
        customer_id: UUID | None = None
    ) -> int:
        statement = select(func.count()).select_from(Booking)
        
        if status:
            statement = statement.where(Booking.status == status)
        if room_id:
            statement = statement.where(Booking.room_id == room_id)
        if customer_id:
            statement = statement.where(Booking.customer_id == customer_id)
        
        return session.exec(statement).one()
    
    def get_overlapping(
        self,
        session: Session,
        *,
        room_id: UUID,
        check_in: datetime,
        check_out: datetime,
        exclude_id: UUID | None = None,
        buffer_minutes: int = 15
    ) -> list[Booking]:
        query = select(Booking).where(
            and_(
                Booking.room_id == room_id,
                Booking.status != BookingStatus.CANCELLED,
                Booking.check_out > check_in - timedelta(minutes=buffer_minutes),
                Booking.check_in < check_out + timedelta(minutes=buffer_minutes),
            )
        )
        if exclude_id:
            query = query.where(Booking.id != exclude_id)
        
        return session.exec(query.with_for_update()).all()

booking = CRUDBooking(Booking)
```

### STEP 5: Update ALL Routers to Use CRUD

**WHY**: Routers currently have mixed patterns:
- Some use direct database access: `session.exec(select(Customer)...)`
- Some use services (but services have SQL)
- Some use old CRUD functions
- Permission checks are inside function bodies instead of decorators

**PROBLEMS TO FIX**:
1. Remove ALL direct database queries from routers
2. Move permission checks to decorators (visible in OpenAPI)
3. Use CRUD for all database operations
4. Standardize error handling

#### Fix `/home/malik/hotelcrm/backend/app/api/routes/customers.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import SessionDep, CurrentUser
from app.crud.customer import customer as crud_customer
from app.models import CustomerCreate, CustomerPublic, CustomersPublic, CustomerUpdate, Message
from app.core.audit import log_audit, get_entity_name

router = APIRouter()

@router.get("/", response_model=CustomersPublic)
def read_customers(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
) -> Any:
    """Retrieve customers."""
    customers = crud_customer.get_multi_with_search(
        session, skip=skip, limit=limit, search=search
    )
    count = crud_customer.count_with_search(session, search=search)
    return CustomersPublic(data=customers, count=count)

@router.get("/{customer_id}", response_model=CustomerPublic)
def read_customer(
    session: SessionDep,
    current_user: CurrentUser,
    customer_id: uuid.UUID,
) -> Any:
    """Get customer by ID."""
    customer = crud_customer.get(session, id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/", response_model=CustomerPublic)
def create_customer(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    customer_in: CustomerCreate,
) -> Any:
    """Create new customer."""
    # Check if phone exists
    if crud_customer.get_by_phone(session, phone=customer_in.phone):
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    customer = crud_customer.create(session, obj_in=customer_in)
    
    # Log audit
    entity_name = get_entity_name("customer", customer)
    log_audit(
        session=session,
        user=current_user,
        action="created",
        entity_type="customer",
        entity_id=customer.id,
        entity_name=entity_name,
    )
    
    session.commit()
    session.refresh(customer)
    return customer

@router.put("/{customer_id}", response_model=CustomerPublic)
def update_customer(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
) -> Any:
    """Update a customer."""
    customer = crud_customer.get(session, id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check phone uniqueness if changing
    if customer_in.phone and customer_in.phone != customer.phone:
        if crud_customer.get_by_phone(session, phone=customer_in.phone):
            raise HTTPException(status_code=400, detail="Phone number already in use")
    
    # Get old values for audit
    old_values = customer.model_dump()
    
    customer = crud_customer.update(session, db_obj=customer, obj_in=customer_in)
    
    # Log audit
    new_values = customer.model_dump()
    entity_name = get_entity_name("customer", customer)
    log_audit(
        session=session,
        user=current_user,
        action="updated",
        entity_type="customer",
        entity_id=customer.id,
        entity_name=entity_name,
        old_values=old_values,
        new_values=new_values,
    )
    
    session.commit()
    session.refresh(customer)
    return customer

@router.delete("/{customer_id}", response_model=Message)
def delete_customer(
    session: SessionDep,
    current_user: CurrentUser,
    customer_id: uuid.UUID,
) -> Any:
    """Delete a customer."""
    customer = crud_customer.get(session, id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check for existing bookings
    from app.crud.booking import booking as crud_booking
    if crud_booking.count_filtered(session, customer_id=customer_id) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete customer with existing bookings"
        )
    
    # Log audit before deletion
    entity_name = get_entity_name("customer", customer)
    log_audit(
        session=session,
        user=current_user,
        action="deleted",
        entity_type="customer",
        entity_id=customer.id,
        entity_name=entity_name,
    )
    
    crud_customer.delete(session, id=customer_id)
    session.commit()
    return Message(message="Customer deleted successfully")
```

### STEP 6: Fix Reports Router Background Tasks

**WHY**: The reports router mixes naming conventions (`db` vs `session`) and passes database sessions incorrectly to background tasks.

**PROBLEMS**:
1. Uses `db: SessionDep` instead of `session: SessionDep`
2. Tries to pass request session to background tasks (will fail!)
3. Services are called with wrong parameter names

**WHAT TO DO**: Rename all `db` to `session` and fix how services are initialized.

In `/home/malik/hotelcrm/backend/app/api/routes/reports.py`:

FIND all background task functions like:
```python
async def generate_occupancy_report_task(
    job_id: uuid.UUID,
    db: Session,
```

REPLACE WITH:
```python
async def generate_occupancy_report_task(
    job_id: uuid.UUID,
    session: Session,
```

Then inside each task, replace:
- `db` → `session`
- When calling services: `AnalyticsService(session)` (not `db`)

### STEP 7: Update Dependency Names in All Routes

**WHY**: Inconsistent naming creates confusion. Some routes use `session`, others use `db`. This makes the codebase harder to understand and maintain.

**CURRENT PROBLEM**:
```python
# Inconsistent across files:
def create_customer(session: SessionDep, ...):  # customers.py uses session
def generate_report(db: SessionDep = None, ...):  # reports.py uses db
```

**WHAT TO DO**: Standardize to `session` everywhere (SQLModel convention).

In `/home/malik/hotelcrm/backend/app/api/routes/data_import.py`:

FIND ALL:
```python
db: SessionDep = None
```

REPLACE WITH:
```python
session: SessionDep
```

In `/home/malik/hotelcrm/backend/app/api/routes/reports.py`:

FIND ALL:
```python
db: SessionDep = None
```

REPLACE WITH:
```python
session: SessionDep
```

Then update ALL usage inside functions:
- `db.exec()` → `session.exec()`
- `db.get()` → `session.get()`
- `db.add()` → `session.add()`
- `db.commit()` → `session.commit()`

### STEP 8: Create Missing Service Classes

**WHY**: Currently, customers and rooms have NO service layer. Business logic is scattered between routers (HTTP layer) and models (data layer). This violates single responsibility principle.

**CURRENT PROBLEM**:
```python
# BAD - Business logic in router:
@router.post("/customers")
def create_customer(...):
    # 50+ lines of business logic here!
    if existing_phone:  # Business rule in router
        raise HTTPException(...)
```

**SOLUTION**: Create service classes that handle all business logic. Routers should only handle HTTP concerns.

**WHAT TO DO**: Create dedicated service classes for entities that don't have them.

Create `/home/malik/hotelcrm/backend/app/services/customer.py`:
```python
from sqlmodel import Session
from app.crud.customer import customer as crud_customer
from app.models import Customer, CustomerCreate, CustomerUpdate

class CustomerService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_customer
    
    def create_customer(self, customer_in: CustomerCreate) -> Customer:
        """Create customer with business logic."""
        # Check if phone exists
        if self.crud.get_by_phone(self.session, phone=customer_in.phone):
            raise ValueError("Phone number already registered")
        
        return self.crud.create(self.session, obj_in=customer_in)
    
    def update_customer(self, customer: Customer, customer_in: CustomerUpdate) -> Customer:
        """Update customer with validations."""
        if customer_in.phone and customer_in.phone != customer.phone:
            if self.crud.get_by_phone(self.session, phone=customer_in.phone):
                raise ValueError("Phone number already in use")
        
        return self.crud.update(self.session, db_obj=customer, obj_in=customer_in)
```

Create `/home/malik/hotelcrm/backend/app/services/room.py`:
```python
from sqlmodel import Session
from app.crud.room import room as crud_room
from app.models import Room, RoomCreate, RoomUpdate

class RoomService:
    def __init__(self, session: Session):
        self.session = session
        self.crud = crud_room
    
    def create_room(self, room_in: RoomCreate) -> Room:
        """Create room with validations."""
        # Check if room number exists
        if self.crud.get_by_room_number(self.session, room_number=room_in.room_number):
            raise ValueError("Room number already exists")
        
        return self.crud.create(self.session, obj_in=room_in)
    
    def update_room(self, room: Room, room_in: RoomUpdate) -> Room:
        """Update room with validations."""
        if room_in.room_number and room_in.room_number != room.room_number:
            if self.crud.get_by_room_number(self.session, room_number=room_in.room_number):
                raise ValueError("Room number already exists")
        
        return self.crud.update(self.session, db_obj=room, obj_in=room_in)
```

### STEP 9: Create Centralized Permission Dependencies

**WHY**: Permission checks are scattered and inconsistent. Some are buried deep in function bodies, making them:
- Hard to find and audit
- Not visible in API documentation
- Easy to forget
- Difficult to test

**CURRENT PROBLEM**:
```python
# BAD - Permission check hidden in function:
def update_booking(...):
    # ... 100 lines later...
    if booking_in.discount != booking.discount:
        check_admin_or_manager(current_user)  # Easy to miss!
```

**SOLUTION**: Centralize all permission checks as reusable dependencies that are visible in decorators.

**WHAT TO DO**: Create standard permission dependencies that can be used consistently across all routes.

In `/home/malik/hotelcrm/backend/app/api/deps.py`, ADD:
```python
def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> User:
    """Require admin role."""
    if current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def require_admin_or_manager(current_user: CurrentUser = Depends(get_current_user)) -> User:
    """Require admin or manager role."""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER] and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin or manager access required")
    return current_user
```

Then in routers, replace:
```python
# OLD:
check_admin_or_manager(current_user)

# NEW:
@router.post("/", dependencies=[Depends(require_admin_or_manager)])
```

### STEP 10: Fix Bookings Router (MOST COMPLEX - 570 lines)

**WHY THIS IS CRITICAL**: The bookings router is the worst offender with:
- 570 lines of mixed concerns
- Direct SQL queries everywhere: `session.exec(select(Booking).where(...))`
- Complex business logic in router (should be in service)
- Inconsistent transaction handling
- Permission checks scattered throughout functions

**CURRENT PROBLEMS**:
```python
# BAD - Current bookings router has:
def update_booking(...):
    # 200+ lines of business logic in router!
    overlapping_bookings = session.exec(
        select(Booking).where(...)  # Direct SQL!
    ).all()
    
    if booking_in.discount != booking.discount:
        check_admin_or_manager(current_user)  # Permission check buried in code
```

**WHAT TO DO**: Complete separation - router only handles HTTP, service handles logic, CRUD handles SQL.

In `/home/malik/hotelcrm/backend/app/api/routes/bookings.py`:

```python
from app.crud.booking import booking as crud_booking
from app.services.booking_service import BookingService

@router.get("/", response_model=BookingsPublic)
def read_bookings(
    session: SessionDep,  # NOT db
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
    status: BookingStatus | None = None,
    room_id: uuid.UUID | None = None,
    customer_id: uuid.UUID | None = None,
) -> Any:
    """Retrieve bookings."""
    bookings = crud_booking.get_multi_filtered(
        session,
        skip=skip,
        limit=limit,
        status=status,
        room_id=room_id,
        customer_id=customer_id
    )
    count = crud_booking.count_filtered(
        session,
        status=status,
        room_id=room_id,
        customer_id=customer_id
    )
    return BookingsPublic(data=bookings, count=count)

@router.post("/", response_model=BookingPublic)
def create_booking(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    booking_in: BookingCreate,
) -> Any:
    """Create new booking."""
    service = BookingService(session)
    
    try:
        booking = service.create_booking(booking_in)
        
        # Audit logging
        entity_name = get_entity_name("booking", booking)
        log_audit(
            session=session,
            user=current_user,
            action="created",
            entity_type="booking",
            entity_id=booking.id,
            entity_name=entity_name,
        )
        
        # Standard transaction pattern
        session.commit()
        session.refresh(booking)
        
        # Reload with relationships
        return crud_booking.get_with_relations(session, booking_id=booking.id)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

Remove ALL direct DB operations from this router!

### STEP 11: Fix Rooms Router

**WHY**: The rooms router has the same problems as others:
- Direct database queries in router functions
- Permission checks inside function bodies
- No service layer usage
- Mixed business logic with HTTP handling

**CURRENT PROBLEM**:
```python
# BAD - Current rooms router:
def create_room(...):
    check_admin_or_manager(current_user)  # Hidden permission check
    room = Room.model_validate(room_in)   # Direct model manipulation
    session.add(room)                     # Direct DB access in router
```

**WHAT TO DO**: Refactor to use Service → CRUD pattern with permission dependencies.

In `/home/malik/hotelcrm/backend/app/api/routes/rooms.py`:

```python
from app.crud.room import room as crud_room
from app.services.room import RoomService

@router.get("/", response_model=RoomsPublic)
def read_rooms(
    session: SessionDep,  # NOT db
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Retrieve rooms."""
    rooms = crud_room.get_multi(session, skip=skip, limit=limit)
    count = crud_room.count(session)
    return RoomsPublic(data=rooms, count=count)

@router.post("/", response_model=RoomPublic, dependencies=[Depends(require_admin_or_manager)])
def create_room(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    room_in: RoomCreate,
) -> Any:
    """Create new room. Only admin and manager can create rooms."""
    service = RoomService(session)
    
    try:
        room = service.create_room(room_in)
        
        # Audit logging
        entity_name = get_entity_name("room", room)
        log_audit(
            session=session,
            user=current_user,
            action="created",
            entity_type="room",
            entity_id=room.id,
            entity_name=entity_name,
        )
        
        session.commit()
        session.refresh(room)
        return room
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### STEP 12: Enhance BookingService

**WHY**: BookingService exists but is underutilized. It has:
- Static methods instead of instance methods
- Direct session passing instead of storing it
- SQL queries that should be in CRUD
- Missing critical business logic that's still in routers

**CURRENT PROBLEM**:
```python
# BAD - Current BookingService:
@staticmethod
def check_room_availability(session: Session, ...):  # Static method
    query = select(Booking).where(...)  # SQL in service!
    return session.exec(query).all()    # Direct DB access!
```

**WHAT TO DO**: Refactor to proper service pattern with instance methods and CRUD delegation.

Update `/home/malik/hotelcrm/backend/app/services/booking_service.py`:

```python
from sqlmodel import Session
from app.crud.booking import booking as crud_booking
from app.crud.room import room as crud_room
from app.crud.customer import customer as crud_customer
from app.models import BookingCreate, BookingUpdate, Booking, BookingStatus, RoomStatus
from app.core.customer_stats import update_customer_stats_on_booking_change

class BookingService:
    def __init__(self, session: Session):  # NOT db
        self.session = session
        self.crud_booking = crud_booking
        self.crud_room = crud_room
        self.crud_customer = crud_customer
    
    def create_booking(self, booking_in: BookingCreate) -> Booking:
        """Create booking with all validations."""
        # Verify customer exists
        customer = self.crud_customer.get(self.session, id=booking_in.customer_id)
        if not customer:
            raise ValueError("Customer not found")
        
        # Verify room exists and is available
        room = self.crud_room.get(self.session, id=booking_in.room_id)
        if not room:
            raise ValueError("Room not found")
        
        if room.status != RoomStatus.AVAILABLE:
            raise ValueError(f"Room is currently {room.status.value} and cannot be booked")
        
        # Check overlapping bookings
        overlapping = self.crud_booking.get_overlapping(
            self.session,
            room_id=booking_in.room_id,
            check_in=booking_in.check_in,
            check_out=booking_in.check_out
        )
        
        if overlapping:
            raise ValueError("Room is not available for the selected dates")
        
        # Create booking
        booking = self.crud_booking.create(self.session, obj_in=booking_in)
        
        # Update customer stats
        update_customer_stats_on_booking_change(
            session=self.session,
            customer_id=booking_in.customer_id,
            amount_delta=booking_in.total_amount,
            booking_delta=1,
            new_booking_date=datetime.utcnow()
        )
        
        return booking
    
    # Remove ALL check_room_availability static methods
    # Replace with instance methods using self.crud_booking
```

### STEP 13: Add Missing Audit Logging

**WHY**: Some operations are not being logged for audit trail. The data_import route performs significant data changes but doesn't log them. This creates compliance and debugging issues.

**CURRENT PROBLEM**:
```python
# BAD - No audit logging:
def import_customers_from_csv(...):
    # Import 100 customers
    # No record of who did this or when!
```

**WHAT TO DO**: Add audit logging for all data-modifying operations.

In `/home/malik/hotelcrm/backend/app/api/routes/data_import.py`:

After successful import, ADD:
```python
from app.core.audit import log_audit

# After successful import
log_audit(
    session=session,
    user=current_user,
    action="imported",
    entity_type="customers",
    entity_id=uuid.uuid4(),  # Generate a tracking ID
    entity_name=f"CSV Import",
    description=f"Imported {result['imported']} customers from CSV"
)
```

### STEP 14: Standardize Error Responses

**WHY**: Currently, error handling is inconsistent:
- Some endpoints return plain text errors
- Others return JSON with different structures
- No standard error codes
- Frontend has to handle multiple error formats

**CURRENT PROBLEM**:
```python
# BAD - Inconsistent error responses:
raise HTTPException(404, "Customer not found")  # Plain text
raise HTTPException(400, {"error": "Invalid"})  # Different structure
return {"success": False, "message": "Failed"}  # Yet another format
```

**SOLUTION**: Create standardized error response schemas for consistency.

**WHAT TO DO**: Define common error response models that all endpoints will use.

Create `/home/malik/hotelcrm/backend/app/schemas/common.py`:

```python
from pydantic import BaseModel
from typing import Any

class ErrorResponse(BaseModel):
    """Structured error response."""
    error: str
    detail: str | None = None
    code: str | None = None

class ValidationErrorResponse(BaseModel):
    """Validation error response."""
    error: str = "validation_error"
    errors: list[dict[str, Any]]

class BusinessErrorResponse(BaseModel):
    """Business logic error response."""
    error: str = "business_error"
    message: str
    code: str | None = None
```

Then in routers, use structured responses:
```python
from app.schemas.common import ErrorResponse

@router.post("/")
def create_something():
    try:
        # ... logic
    except ValueError as e:
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="invalid_request",
                detail=str(e),
                code="VALIDATION_ERROR"
            ).model_dump()
        )
```

### STEP 15: Standardize Import Organization

For ALL Python files, use this order:

```python
# 1. Standard library imports
import json
import uuid
from datetime import datetime, timedelta
from typing import Any

# 2. Third-party imports
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlmodel import Session, and_, or_

# 3. Local application imports
from app.api.deps import SessionDep, CurrentUser, require_admin
from app.core.audit import log_audit, get_entity_name
from app.crud.customer import customer as crud_customer
from app.models import Customer, CustomerCreate, CustomerUpdate
from app.services.customer import CustomerService
```

Use `isort` to automate this:
```bash
cd backend
uv add --dev isort
uv run isort app/ --profile black
```

### STEP 16: Fix Relationship Loading

In ALL CRUD classes, when returning single entities:

```python
def get_with_relations(self, session: Session, *, id: UUID) -> ModelType | None:
    """Get entity with all relationships loaded."""
    from sqlalchemy.orm import joinedload
    
    statement = (
        select(self.model)
        .where(self.model.id == id)
        .options(
            joinedload(self.model.relationship1),  # type: ignore
            joinedload(self.model.relationship2),  # type: ignore
        )
    )
    return session.exec(statement).first()
```

### STEP 17: Update Tests

Update `/home/malik/hotelcrm/backend/app/tests/api/routes/test_customers.py`:

```python
from unittest.mock import Mock, patch
from app.crud.customer import customer as crud_customer

def test_create_customer(client: TestClient, superuser_token_headers: dict[str, str]) -> None:
    """Test customer creation."""
    with patch.object(crud_customer, 'get_by_phone', return_value=None):
        with patch.object(crud_customer, 'create') as mock_create:
            mock_create.return_value = Mock(
                id=uuid.uuid4(),
                first_name="Test",
                last_name="User",
                phone="+1234567890"
            )
            
            data = {
                "first_name": "Test",
                "last_name": "User",
                "phone": "+1234567890"
            }
            
            response = client.post(
                "/api/v1/customers/",
                headers=superuser_token_headers,
                json=data,
            )
            
            assert response.status_code == 200
            mock_create.assert_called_once()
```

### STEP 18: Refactor crud_reports.py

Update `/home/malik/hotelcrm/backend/app/crud_reports.py` to follow new patterns:

```python
from app.crud.base import CRUDBase
from app.models import ReportJob, ReportJobCreate, ReportJobUpdate

class CRUDReport(CRUDBase[ReportJob, ReportJobCreate, ReportJobUpdate]):
    def get_by_user(
        self, session: Session, *, job_id: UUID, user_id: UUID
    ) -> ReportJob | None:
        statement = select(ReportJob).where(
            ReportJob.id == job_id,
            ReportJob.user_id == user_id
        )
        return session.exec(statement).first()
    
    def list_by_user(
        self,
        session: Session,
        *,
        user_id: UUID | None = None,
        status: ReportJobStatus | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ReportJob]:
        statement = select(ReportJob)
        
        if user_id:
            statement = statement.where(ReportJob.user_id == user_id)
        if status:
            statement = statement.where(ReportJob.status == status)
        
        statement = statement.order_by(ReportJob.created_at.desc())
        statement = statement.offset(skip).limit(limit)
        return session.exec(statement).all()

report = CRUDReport(ReportJob)
```

Then update all references from function calls to method calls:
- `create_report_job()` → `report.create()`
- `update_report_job()` → `report.update()`
- `get_report_job()` → `report.get()`

### STEP 19: Fix Permission Checking - CRITICAL

**WHY**: Currently we have 3 different permission checking patterns used randomly:
1. **Imperative** (hidden in function body): `check_admin_or_manager(current_user)`
2. **Dependency injection**: `Depends(get_current_admin_user)` 
3. **Direct check**: `if current_user.role != UserRole.ADMIN`

**PROBLEMS**:
- Permissions not visible in OpenAPI documentation
- Hard to test (need to mock different things)
- Easy to forget permission checks
- Inconsistent error messages

**SOLUTION**: Use Dependencies in decorators for ALL permission checks.

Find ALL occurrences of `check_admin_or_manager(current_user)` and replace with Dependencies:

```python
# OLD (in router function body):
check_admin_or_manager(current_user)

# NEW (in router decorator):
@router.post("/", dependencies=[Depends(require_admin_or_manager)])
def create_room(...):
    # No need to check inside function
```

Search and replace in these files:
- `/home/malik/hotelcrm/backend/app/api/routes/rooms.py`
- `/home/malik/hotelcrm/backend/app/api/routes/bookings.py`

### STEP 20: Handle Booking Check-in/Check-out Logic

In BookingService, add methods for complex status transitions:

```python
def check_in_booking(self, booking: Booking) -> Booking:
    """Handle check-in with room status updates."""
    if booking.status != BookingStatus.CONFIRMED:
        raise ValueError("Only confirmed bookings can be checked in")
    
    room = self.crud_room.get(self.session, id=booking.room_id)
    if not room:
        raise ValueError("Room not found")
    
    if room.status != RoomStatus.AVAILABLE:
        raise ValueError("Room must be available to check in")
    
    # Check for conflicts
    overlapping = self.crud_booking.get_overlapping(
        self.session,
        room_id=booking.room_id,
        check_in=booking.check_in,
        check_out=booking.check_out,
        exclude_id=booking.id
    )
    
    if overlapping:
        raise ValueError("Cannot check in: room has conflicting bookings")
    
    # Update statuses
    booking.status = BookingStatus.CHECKED_IN
    room.status = RoomStatus.OCCUPIED
    
    self.session.add(booking)
    self.session.add(room)
    self.session.flush()
    
    return booking

def check_out_booking(self, booking: Booking) -> Booking:
    """Handle check-out with room status updates."""
    if booking.status != BookingStatus.CHECKED_IN:
        raise ValueError("Only checked-in bookings can be checked out")
    
    room = self.crud_room.get(self.session, id=booking.room_id)
    if room:
        room.status = RoomStatus.CLEANING
        self.session.add(room)
    
    booking.status = BookingStatus.CHECKED_OUT
    self.session.add(booking)
    self.session.flush()
    
    return booking
```

### STEP 21: Fix storage_service Async

In `/home/malik/hotelcrm/backend/app/services/storage_service.py`:

```python
# Change ALL async methods to sync:
class StorageService:
    def save_file(self, content: bytes, filename: str, category: str) -> str:
        # NOT async def
        # Remove all await
        
    def get_file(self, file_path: str) -> bytes | None:
        # NOT async def
        
    def cleanup_old_files(self, days: int) -> int:
        # NOT async def
```

### STEP 22: Update User CRUD

Update `/home/malik/hotelcrm/backend/app/crud.py` to use base class:

```python
from app.crud.base import CRUDBase
from app.models import User, UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def create(self, session: Session, *, obj_in: UserCreate) -> User:
        user = User.model_validate(
            obj_in, 
            update={"hashed_password": get_password_hash(obj_in.password)}
        )
        session.add(user)
        session.flush()
        return user
    
    def update(self, session: Session, *, db_obj: User, obj_in: UserUpdate) -> User:
        update_data = obj_in.model_dump(exclude_unset=True)
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        
        db_obj.sqlmodel_update(update_data)
        session.add(db_obj)
        session.flush()
        return db_obj
    
    def get_by_username(self, session: Session, *, username: str) -> User | None:
        statement = select(User).where(User.username == username)
        return session.exec(statement).first()
    
    def authenticate(self, session: Session, *, username: str, password: str) -> User | None:
        user = self.get_by_username(session=session, username=username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

user = CRUDUser(User)
```

Then update all imports:
```python
# OLD:
from app import crud

# NEW:
from app.crud.user import user as crud_user
```

### STEP 23: Fix Background Tasks Session Handling - IMPORTANT

**WHY**: Background tasks run AFTER the HTTP response is sent. The request's database session is already closed by then!

**CURRENT PROBLEM**:
```python
# BAD - This will fail:
async def generate_report_task(db: Session):  # Session from request
    db.get(ReportJob, job_id)  # CRASH! Session already closed
```

**SOLUTION**: Background tasks must create their own database session.

**WHAT TO DO**: Never pass `session` from request to background task. Create new session inside task.

In `/home/malik/hotelcrm/backend/app/api/routes/reports.py`, background tasks need their own session:

```python
async def generate_occupancy_report_task(
    job_id: uuid.UUID,
    # Don't pass session from request!
) -> None:
    """Background task with its own session."""
    from app.core.db import engine
    from sqlmodel import Session
    
    # Create new session for background task
    with Session(engine) as session:
        job = session.get(ReportJob, job_id)
        if not job:
            return
        
        # Update status
        job.status = ReportJobStatus.PROCESSING
        session.add(job)
        session.commit()
        
        try:
            # Use services with this session
            analytics = AnalyticsService(session)
            data = analytics.get_occupancy_report(...)  # NOT await
            
            # ... rest of logic
            
            job.status = ReportJobStatus.COMPLETED
            session.add(job)
            session.commit()
            
        except Exception as e:
            job.status = ReportJobStatus.FAILED
            job.error_message = str(e)
            session.add(job)
            session.commit()
```

When calling:
```python
background_tasks.add_task(
    generate_occupancy_report_task,
    report_job.id,
    # Don't pass session!
)
```

### STEP 24: Define Validation Strategy

Add to beginning of plan:

**VALIDATION RULES:**
1. **Models**: Only structural validation (types, lengths, formats)
2. **Services**: Business logic validation (uniqueness, availability, permissions)
3. **Routers**: Request validation and error handling only

Example:
```python
# In Model (structural):
class CustomerCreate(SQLModel):
    phone: str = Field(regex=r"^\+?[1-9]\d{6,14}$")  # Format validation
    
# In Service (business logic):
def create_customer(self, customer_in: CustomerCreate):
    if self.crud.get_by_phone(self.session, phone=customer_in.phone):
        raise ValueError("Phone already exists")  # Business validation
    
# In Router (request handling):
try:
    customer = service.create_customer(customer_in)
except ValueError as e:
    raise HTTPException(400, detail=str(e))  # Error handling
```

### STEP 25: Run Final Verification

```bash
cd backend
uv run python -m pytest
uv run ruff check . --fix
uv run python -m mypy .
uv run isort app/ --profile black --check-only
```

Fix any issues that arise.

## FINAL VERIFICATION CHECKLIST

After completing ALL steps, verify these patterns are consistent everywhere:

### 1. Database Access Pattern
```python
# ✅ GOOD - Router → Service → CRUD → DB:
router: result = service.create_item(data)
service: item = self.crud.create(session, obj_in=data)
crud: session.add(item); session.flush(); return item

# ❌ BAD - Direct DB access in router/service:
router: session.exec(select(Item)...)  # NO!
service: self.session.add(item)  # NO!
```

### 2. Async Pattern
```python
# ✅ GOOD - Sync services (no fake async):
def get_report(self, ...):  # No async

# ❌ BAD - Fake async:
async def get_report(self, ...):  # But no await inside!
```

### 3. Naming Pattern
```python
# ✅ GOOD:
def create_item(session: SessionDep, ...)

# ❌ BAD:
def create_item(db: SessionDep, ...)
```

### 4. Permission Pattern
```python
# ✅ GOOD - In decorator:
@router.post("/", dependencies=[Depends(require_admin)])

# ❌ BAD - In function body:
def create(): 
    check_admin_or_manager(current_user)
```

### 5. Transaction Pattern
```python
# ✅ GOOD - Standard pattern:
session.add(entity)
session.flush()  # Get ID
log_audit(...)  # Same transaction
session.commit()
session.refresh(entity)

# ❌ BAD - Mixed patterns
```

## COMMON ERRORS AND SOLUTIONS

| Error | Solution |
|-------|----------|
| `AttributeError: 'AsyncSession' object has no attribute 'exec'` | You're using async session with sync code. Use regular Session. |
| `sqlalchemy.exc.InvalidRequestError: Object is already attached to session` | Don't pass objects between sessions. Use IDs instead. |
| `Session is closed` | Background tasks need their own session, not request session. |
| `No module named 'app.crud.customer'` | Create the CRUD file first before importing. |

## IMPORTANT NOTES

1. **Execute steps in order** - Later steps depend on earlier ones
2. **Run tests after each major step** - Don't wait until the end
3. **If a step fails** - Check if previous steps were completed correctly
4. **Background tasks** - Always create new session, never use request session
5. **Permissions** - Always use Dependencies, never inline checks