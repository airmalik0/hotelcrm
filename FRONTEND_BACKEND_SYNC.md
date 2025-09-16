# Frontend-Backend Synchronization Audit Methodology

## 🎯 Purpose
This document provides a systematic approach to identify and fix synchronization issues between frontend and backend in a full-stack application, ensuring the UI always reflects the current backend state.

## 🔍 Step-by-Step Audit Process

### Step 1: Map Backend Side Effects

#### 1.1 Identify ALL State Changes
For each backend service method, create a side-effect map:

```bash
# Find all service methods
grep -h "def " backend/app/services/*.py | grep -v "__"

# For each method, find what it changes
grep -A 30 "def METHOD_NAME" backend/app/services/*.py
```

**What to look for:**
- `crud_*.update_status()` - Status changes
- `update_*_stats()` - Statistics updates
- `crud_*.update()` - Direct entity updates
- `session.add()` - New entity creation
- `session.delete()` - Entity removal

#### 1.2 Create Side Effect Matrix

| Operation | Primary Entity | Secondary Effects | Example |
|-----------|---------------|-------------------|---------|
| `create_booking` | Booking created | Customer: total_spent ↑, total_bookings ↑ | Customer stats change but frontend only invalidates bookings |
| `check_in_booking` | Booking: status → CHECKED_IN | Room: status → OCCUPIED | Room status changes but frontend doesn't know |
| `check_out_booking` | Booking: status → CHECKED_OUT | Room: status → CLEANING | Room needs cleaning but UI doesn't update |
| `cancel_booking` | Booking: status → CANCELLED | Room: status → CLEANING (if checked_in)<br>Customer: stats ↓ | Multiple entities affected |

### Step 2: Audit Frontend Mutations

#### 2.1 Find All Mutations
```bash
# List all mutations
grep -r "useMutation" frontend/src --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort -u

# For each file, check what's invalidated
grep -B5 -A10 "onSuccess" FILE_PATH | grep "invalidate"
```

#### 2.2 Create Invalidation Checklist

For EACH mutation, verify:
- [ ] Primary entity invalidated?
- [ ] All secondary entities from Step 1.2 invalidated?
- [ ] Parent lists invalidated? (e.g., ["bookings"] when ["booking", id] changes)
- [ ] Related statistics invalidated?

### Step 3: Validate Business Rules

#### 3.1 Find Backend Validations
```bash
# Find all backend validation rules
grep -r "raise ValueError" backend/app/services/ | grep -v test

# Find status transition rules
grep -r "is_status_transition_valid\|valid_transitions" backend/app/
```

#### 3.2 Check Frontend Mirrors Rules

For each backend validation, ensure frontend has equivalent:

**Backend:**
```python
if room.status == RoomStatus.MAINTENANCE:
    raise ValueError("Room is under maintenance")
```

**Frontend should have:**
```typescript
if (room.status === "maintenance") {
  alert("Room is under maintenance")
  return
}
```

### Step 4: Test Reactive Updates

#### 4.1 Multi-Window Test Protocol

1. Open application in 2 browser windows
2. In Window A, perform an action
3. In Window B, verify WITHOUT refresh:
   - [ ] Primary entity updated?
   - [ ] Related entities updated?
   - [ ] Statistics/counts updated?
   - [ ] Status badges changed?

#### 4.2 Critical Test Scenarios

| Action in Window A | Expected in Window B |
|-------------------|---------------------|
| Create booking | Customer stats update, Room shown as will-be-occupied |
| Check-in | Room status → OCCUPIED (green → red) |
| Check-out | Room status → CLEANING (red → yellow) |
| Cancel booking | Customer stats decrease, Room → CLEANING if was occupied |
| Drag booking to new room | Both rooms update status |
| Update booking amount | Customer total_spent updates |

### Step 5: Create Automated Checks

#### 5.1 Query Invalidation Audit Script
```javascript
// utils/audit-invalidations.ts
function auditMutation(mutationName: string, expectedInvalidations: string[]) {
  const actualInvalidations = extractInvalidations(mutationName)
  const missing = expectedInvalidations.filter(x => !actualInvalidations.includes(x))

  if (missing.length > 0) {
    console.error(`${mutationName} missing invalidations:`, missing)
  }
}

// Run audit
auditMutation('checkInBooking', ['bookings', 'rooms'])
auditMutation('createBooking', ['bookings', 'customers'])
```

#### 5.2 Validation Parity Check
```typescript
// Compare backend and frontend validations
const backendValidations = extractBackendValidations()
const frontendValidations = extractFrontendValidations()

const missingInFrontend = backendValidations.filter(
  v => !frontendValidations.includes(v)
)
```

## 📋 Common Patterns to Check

### 1. Status Cascades
When entity A status changes → entity B status must change

**Example:** Booking CHECKED_IN → Room OCCUPIED

**Check:**
- Does frontend invalidate both entities?
- Are both status updates visible immediately?

### 2. Aggregate Updates
When child entity changes → parent aggregates must update

**Example:** New booking → Customer total_spent, total_bookings

**Check:**
- Does frontend invalidate parent entity?
- Do statistics update without refresh?

### 3. Bidirectional Updates
When moving entity from A to B → both A and B must update

**Example:** Drag booking from Room 101 to Room 102

**Check:**
- Does Room 101 status update?
- Does Room 102 status update?
- Are both changes immediate?

### 4. Conditional Side Effects
Side effects that only happen in certain states

**Example:** Cancel booking → Room becomes CLEANING only if was CHECKED_IN

**Check:**
- Does frontend check the condition?
- Is invalidation conditional too?

## 🛠️ Implementation Pattern

### Correct Mutation Pattern
```typescript
const mutation = useMutation({
  mutationFn: apiCall,
  onSuccess: (result, variables) => {
    // 1. Always invalidate primary entity
    queryClient.invalidateQueries(['entity', id])

    // 2. Check what changed and invalidate accordingly
    if (statusChanged) {
      queryClient.invalidateQueries(['relatedEntity'])
    }

    // 3. If aggregates affected
    if (aggregatesAffected) {
      queryClient.invalidateQueries(['parentEntity'])
    }
  }
})
```

### Validation Pattern
```typescript
// Mirror backend validation
function validateAction(entity: Entity): string | null {
  // Same rules as backend
  if (entity.status === 'invalid_state') {
    return 'Cannot perform action in this state'
  }
  return null
}

// Use before mutation
const error = validateAction(entity)
if (error) {
  alert(error)
  return
}
```

## 🚨 Red Flags

Watch for these common mistakes:

1. **Only invalidating primary entity**
   ```typescript
   // ❌ BAD
   onSuccess: () => {
     queryClient.invalidateQueries(['bookings'])
   }

   // ✅ GOOD
   onSuccess: () => {
     queryClient.invalidateQueries(['bookings'])
     queryClient.invalidateQueries(['rooms'])
     queryClient.invalidateQueries(['customers'])
   }
   ```

2. **Missing client-side validation**
   ```typescript
   // ❌ BAD - Server will reject but poor UX
   checkIn(booking)

   // ✅ GOOD - Fail fast
   if (room.status === 'maintenance') {
     alert('Cannot check in')
     return
   }
   checkIn(booking)
   ```

3. **Hardcoded invalidations**
   ```typescript
   // ❌ BAD - Doesn't adapt to what changed
   invalidateQueries(['bookings'])

   // ✅ GOOD - Conditional based on changes
   if (roomChanged) invalidateQueries(['rooms'])
   if (customerChanged) invalidateQueries(['customers'])
   ```

## 📊 Audit Checklist Template

Use this for each feature:

### Feature: _________________

- [ ] **Backend Analysis**
  - [ ] Listed all side effects
  - [ ] Identified all status changes
  - [ ] Found all aggregate updates
  - [ ] Documented validation rules

- [ ] **Frontend Analysis**
  - [ ] All mutations found
  - [ ] Invalidations match side effects
  - [ ] Client validations mirror backend
  - [ ] Optimistic updates where appropriate

- [ ] **Testing**
  - [ ] Multi-window test passed
  - [ ] All entities update reactively
  - [ ] No stale data after operations
  - [ ] Error states handled properly

- [ ] **Documentation**
  - [ ] Side effects documented
  - [ ] Invalidation strategy explained
  - [ ] Known limitations noted

## 🔄 Continuous Monitoring

### Weekly Checks
1. Review new backend services for side effects
2. Audit new frontend mutations for completeness
3. Run multi-window tests on critical paths

### Per Feature
1. Create side effect map before coding
2. Implement invalidations based on map
3. Test all affected entities update

### Code Review Checklist
- [ ] Does PR identify all side effects?
- [ ] Are all affected queries invalidated?
- [ ] Is client validation present?
- [ ] Have reactive updates been tested?

## 📚 Quick Reference

### Common Hotel CRM Side Effects

| Action | Affected Entities |
|--------|------------------|
| Create Booking | bookings ↑, customers.stats ↑ |
| Check In | bookings.status, rooms.status → OCCUPIED |
| Check Out | bookings.status, rooms.status → CLEANING |
| Cancel Booking | bookings.status, customers.stats ↓, rooms.status? |
| Update Booking | bookings, customers? (if changed), rooms? (if changed) |
| Delete Booking | bookings ↓, customers.stats ↓, rooms.status? |

### Query Keys to Remember
```typescript
['bookings']           // All bookings
['booking', id]        // Specific booking
['rooms']              // All rooms
['room', id]           // Specific room
['customers']          // All customers
['customer', id]       // Specific customer
['audit']              // Audit logs
['users']              // Users list
```

---

**Remember:** Every backend state change must have a corresponding frontend invalidation!