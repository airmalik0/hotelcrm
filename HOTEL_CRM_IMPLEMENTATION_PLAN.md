# Hotel CRM Implementation Plan - Component by Component

## Approach: One Complete Module at a Time

This plan implements a Hotel CRM system component by component, where each component is completed and tested before moving to the next. After each component, implementation pauses for user verification.

**System Features:**
- **Role-based access control** (Admin/Manager/Host)  
- **Time continuum booking calendar** (weekly/monthly views, max 25 rooms)
- **Customer database with individual profiles**
- **Room management module**
- **Comprehensive audit trail** (admin only)
- **Modern React frontend** using WowDash HTML templates as references


**Backend (already analyzed code):**
- ✅ All API endpoints ready: `/api/v1/users/`, `/api/v1/customers/`, `/api/v1/rooms/`, `/api/v1/bookings/`, `/api/v1/audit/`
- ✅ RBAC system: `require_admin`, `require_admin_or_manager` decorators
- ✅ Models: User, Customer, Room, Booking, AuditLog with relationships
- ✅ TypeScript client auto-generation from OpenAPI

**Frontend Foundation:**
- ✅ React 19 + TypeScript + Tailwind CSS + TanStack Query setup
- ✅ WowDash templates: 83 HTML files with extraction patterns documented for references
- ✅ Specific templates identified: `sign-in.html`, `users-list.html`, `table-data.html`, etc.
- ✅ Basic React patterns and component architecture

## Areas Requiring Research During Implementation

**WowDash Integration:**
- ❓ Dark mode toggle mechanism in practice

**Calendar Module (most complex):**
- ❓ HTML5 Drag & Drop implementation for room changes
- ❓ Time continuum positioning with percentage-based layout
- ❓ Real-time synchronization between users
- ❓ Mobile touch interaction handling

**Advanced Features:**
- ❓ File upload implementation (room and passport photos)
- ❓ diff viewer for audit changes
- ❓ Export functionality (CSV/Excel)

## Table of Contents

1. [Current Backend Analysis](#current-backend-analysis)
2. [Role-Based Access Control](#role-based-access-control)  
3. [System Modules](#system-modules)
4. [Time Continuum Calendar Implementation](#time-continuum-calendar-implementation)
5. [Audit Module Design](#audit-module-design)
6. [UX Flow Design](#ux-flow-design)
7. [WowDash Template Mapping](#wowdash-template-mapping)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Technical Architecture](#technical-architecture)

---

## Current Backend Analysis

### ✅ What's Already Implemented

**Authentication & Users:**
- JWT-based authentication with role support
- User roles: `ADMIN`, `MANAGER`, `HOST`
- Permission decorators: `require_admin`, `require_admin_or_manager`
- User CRUD with audit logging
- Password management and validation

**Customer Management:**
- Customer CRUD operations  
- Phone number validation and uniqueness
- Customer statistics (total_spent, total_bookings)
- Search functionality with pagination
- Auto-calculated customer metrics

**Room Management:**
- Room CRUD with status management
- Room types: `STANDARD`, `VIP`
- Room statuses: `AVAILABLE`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`
- Status transition validation
- Photo path storage support

**Booking System:**
- Complete booking lifecycle (confirmed → checked_in → checked_out → cleaning)
- Automatic pricing calculation with discount support
- Date validation and conflict detection  
- Payment method tracking
- Status transition validation

**Audit System:**
- Complete audit trail for all CRUD operations
- Before/after value tracking
- User action logging with timestamps
- Audit statistics and filtering APIs

### 🔧 Ready for Calendar Integration

**Database Structure:**
- `Booking` model with timezone-aware `check_in`/`check_out` datetime fields
- Room ↔ Booking ↔ Customer relationships fully configured
- Booking filtering API by room_id, customer_id, status, date ranges
- Status management APIs ready for real-time updates

---

## Role-Based Access Control

## Role-Based Access Control Matrix

### ADMIN (Full System Access)
**Dashboard:** System stats, user activity, financial metrics, system health  
**Calendar:** Create/Read/Update/Delete bookings, drag & drop (room changes), discount management  
**Rooms:** Create/Read/Update/Delete rooms, status management, pricing  
**Customers:** Create/Read/Update/Delete customers, full profile access  
  
**Users:** Create/Read/Update/Delete users, role assignment  
**Audit:** View all audit logs, filter/search, export audit data  

### MANAGER (Operations Management)
**Dashboard:** Room occupancy, today's bookings, revenue metrics (no system internals)  
**Calendar:** Create/Read/Update/Delete bookings, drag & drop (room changes), discount management  
**Rooms:** Create/Read/Update/Delete rooms, status management, pricing  
**Customers:** Create/Read/Update/Delete customers, full profile access  
**Users:** Read-only view of own profile (no user management)  
**Audit:** No access  

### HOST (Front Desk Operations)
**Dashboard:** Today's check-ins/check-outs, pending tasks only  
**Calendar:** Create/Read bookings, check-in/check-out operations (no drag & drop, no discounts)  
**Rooms:** Read-only view, see status (no editing, no creation)  
**Customers:** Create/Read/Update/Delete customers, full profile access  
**Users:** Read-only view of own profile (no user management)  
**Audit:** No access

### Role Definitions

**ADMIN (System Owner):**
- Complete system control
- User management and role assignment
- Financial data access (pricing, discounts, revenue)
- Security and audit oversight
- System configuration

**MANAGER (Operations Manager):**
- Day-to-day operations management
- Room and booking management
- Customer relationship management  
- Inventory and pricing control
- Basic reporting access

**HOST (Front Desk):**
- Guest service operations
- Check-in/check-out processes
- Booking creation and basic modifications
- Customer information management
- Real-time status updates

---

## System Modules

### 1. Authentication Module
- **Purpose:** Secure login with role detection
- **Users:** All roles
- **Features:**
  - JWT token-based authentication
  - Role-based dashboard routing
  - Session management
  - Password reset (admin-initiated)

### 2. Dashboard Module  
- **Purpose:** Role-specific overview and quick actions
- **Features:**
  - **Admin:** System health, user activity, financial metrics
  - **Manager:** Room occupancy, revenue trends, staff performance  
  - **Host:** Today's schedule, pending check-ins, quick booking

### 3. Calendar Module (Primary Feature)
- **Purpose:** Chess-board booking calendar visualization  
- **Features:**
  - Weekly and monthly view modes
  - Max 25 rooms as rows
  - Drag & drop booking management
  - Real-time status updates
  - Conflict detection and resolution
  - Mobile-responsive design

### 4. Room Management
- **Purpose:** Hotel inventory management
- **Features:**
  - Room CRUD operations (admin/manager only)
  - Status management workflow
  - Photo gallery management
  - Pricing configuration

### 5. Customer Database
- **Purpose:** Guest relationship management
- **Features:**
  - Customer profiles with booking history
  - Contact information management
  - Customer segmentation (VIP, Loyal, Regular)
  - Booking statistics and preferences
  - Document storage (passport photos)


### 6. User Management (Admin Only)
- **Purpose:** Staff account administration
- **Features:**
  - User creation with role assignment
  - Password management

### 7. Audit Module (Admin Only)  
- **Purpose:** Security and compliance tracking
- **Features:**
  - Complete action history
  - Before/after change tracking
  - User activity analytics

---

## Time Continuum Calendar Implementation

### Technical Architecture: Time as Continuous Flow

**Core Concept: Time Continuum**
- **Week View:** 168 continuous hours (7 days × 24 hours)
- **Month View:** ~744 continuous hours (31 days × 24 hours, varies by month)  
- **Booking positioning:** Percentage-based from period start
- **No daily boundaries:** Bookings flow naturally across time

**Container Layout (≤25 rooms = No virtualization needed):**
```css
.calendar-container {
  position: relative;
  width: 100%;
  height: calc(25 * 60px + 40px); /* 25 rooms + header */
}

.calendar-timeline {
  position: absolute;
  top: 40px; /* Header height */
  left: 200px; /* Room sidebar width */
  right: 0;
  height: calc(25 * 60px);
  overflow-x: auto;
  overflow-y: hidden;
}

.room-row {
  position: absolute;
  height: 60px;
  width: 100%;
  border-bottom: 1px solid #e5e5e5;
}
```

**Booking Block Positioning:**
```typescript
interface BookingBlock {
  id: string
  roomId: string
  customerId: string
  check_in: Date
  check_out: Date
  duration: number   // Total hours
  status: BookingStatus
  customer: CustomerPublic
  room: RoomPublic
}

// Calculate position as percentage of total period
const positionBooking = (booking: BookingBlock, periodStart: Date, periodEnd: Date) => {
  const totalPeriodHours = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60)
  const bookingStartOffset = (booking.check_in.getTime() - periodStart.getTime()) / (1000 * 60 * 60)
  const bookingDuration = booking.duration
  
  const leftPercent = (bookingStartOffset / totalPeriodHours) * 100
  const widthPercent = (bookingDuration / totalPeriodHours) * 100
  
  return {
    position: 'absolute',
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    top: '4px',
    height: '52px', // Room height - margins
    backgroundColor: getStatusColor(booking.status),
    borderRadius: '6px',
    minWidth: '60px', // Minimum visible width
  }
}
```

**Time Scale Generation:**
```typescript
const generateTimeScale = (viewMode: 'week' | 'month', startDate: Date) => {
  const totalHours = viewMode === 'week' ? 168 : 744  // 31 days max month
  const tickInterval = viewMode === 'week' ? 6 : 24 // Every 6h for week, 24h for month
  
  const ticks = []
  for (let hour = 0; hour < totalHours; hour += tickInterval) {
    const tickDate = new Date(startDate.getTime() + hour * 60 * 60 * 1000)
    const position = (hour / totalHours) * 100
    
    ticks.push({
      position: `${position}%`,
      label: formatTimeLabel(tickDate, viewMode),
      date: tickDate
    })
  }
  return ticks
}
```

**Drag & Drop Implementation (Room Change Only):**
```typescript
const handleBookingDrag = {
  onDragStart: (booking: BookingBlock, event: DragEvent) => {
    setDraggedBooking(booking)
    const dragData = {
      bookingId: booking.id,
      originalRoomId: booking.roomId,
      check_in: booking.check_in,
      check_out: booking.check_out
    }
    event.dataTransfer?.setData('application/json', JSON.stringify(dragData))
    
    // Visual feedback - highlight valid drop zones
    highlightAvailableRooms(booking)
  },
  
  onDrop: (targetRoomId: string, event: DragEvent) => {
    const dragData = JSON.parse(event.dataTransfer?.getData('application/json') || '{}')
    const booking = draggedBooking
    
    if (!booking || targetRoomId === booking.roomId) {
      return // Same room or invalid
    }
    
    // Check if target room is available for these exact dates/times
    if (!canChangeRoom(booking, targetRoomId)) {
      showError('Target room is not available for these dates')
      return
    }
    
    // Update booking - ONLY room changes, time stays the same
    updateBooking({
      ...booking,
      room_id: targetRoomId,
      // check_in and check_out remain unchanged
    })
    
    clearDropZoneHighlights()
  },
  
  onDragEnd: () => {
    setDraggedBooking(null)
    clearDropZoneHighlights()
  }
}

// Check if room is available for exact time period
const canChangeRoom = (booking: BookingBlock, targetRoomId: string) => {
  const conflictingBookings = existingBookings.filter(existing => 
    existing.roomId === targetRoomId &&
    existing.id !== booking.id &&
    !(booking.check_out <= existing.check_in || booking.check_in >= existing.check_out)
  )
  
  return conflictingBookings.length === 0
}

// Visual feedback for valid drop targets
const highlightAvailableRooms = (booking: BookingBlock) => {
  rooms.forEach(room => {
    const isAvailable = canChangeRoom(booking, room.id)
    const roomElement = document.querySelector(`[data-room-id="${room.id}"]`)
    
    if (roomElement) {
      roomElement.classList.toggle('drop-zone-valid', isAvailable)
      roomElement.classList.toggle('drop-zone-invalid', !isAvailable)
    }
  })
}
```

**Conflict Detection:**
```typescript
const detectConflicts = (newBooking: BookingBlock, existingBookings: BookingBlock[]) => {
  return existingBookings.filter(existing => 
    existing.roomId === newBooking.roomId &&
    existing.id !== newBooking.id &&
    !(newBooking.check_out <= existing.check_in || newBooking.check_in >= existing.check_out)
  )
}
```

**Automatic Gap Management:**
```typescript
const ensureBookingGaps = (bookings: BookingBlock[], minGapMinutes: number = 15) => {
  return bookings.map(booking => {
    const roomBookings = bookings
      .filter(b => b.roomId === booking.roomId && b.id !== booking.id)
      .sort((a, b) => a.check_in.getTime() - b.check_in.getTime())
    
    // Find conflicts and adjust
    const conflicting = roomBookings.find(other => 
      booking.check_in < other.check_out && booking.check_out > other.check_in
    )
    
    if (conflicting) {
      // Auto-adjust to maintain gap
      const gapMs = minGapMinutes * 60 * 1000
      const adjustedCheckIn = new Date(conflicting.check_out.getTime() + gapMs)
      
      return {
        ...booking,
        check_in: adjustedCheckIn,
        check_out: new Date(adjustedCheckIn.getTime() + booking.duration * 60 * 60 * 1000)
      }
    }
    
    return booking
  })
}
```

### Visual Design

**Color Coding:**
- **Confirmed:** `bg-blue-200 border-blue-400` 
- **Checked-in:** `bg-green-200 border-green-400`
- **Checked-out:** `bg-gray-200 border-gray-400`
- **Cancelled:** `bg-red-100 border-red-300`

**Room Status Colors:**
- **Available:** `bg-success-100 border-success-200`
- **Occupied:** `bg-danger-100 border-danger-200` 
- **Cleaning:** `bg-warning-100 border-warning-200`
- **Maintenance:** `bg-purple-100 border-purple-200`

**Interactive Elements:**
- **Hover:** Tooltip with customer details and booking info
- **Click:** Booking detail modal with actions  
- **Drag:** Visual feedback with valid drop zones highlighted (room changes only)

**Responsive Behavior:**
- **Desktop:** Full timeline view with horizontal scroll
- **Tablet:** Scrollable timeline with fixed room sidebar  
- **Mobile:** Compressed timeline with touch gestures, zoom, and full functionality

---

## Audit Module Design

### Interface Components

**Main Audit Table:**
```
┌─────────────────────────────────────────────────────────────┐
│                     AUDIT LOG VIEWER                       │  
│ Filters: [User ▼] [Action ▼] [Entity ▼] [Date Range] [🔍] │
├─────────────────────────────────────────────────────────────┤
│ Time      │ User     │ Action    │ Entity     │ Details     │
│ 14:30:15  │ admin    │ created   │ customer   │ John Smith  │
│ 14:25:03  │ manager1 │ updated   │ room       │ Room 101    │
│ 14:20:45  │ host2    │ checked_in│ booking    │ BK-001      │
│ 14:15:12  │ admin    │ deleted   │ user       │ old_user    │
└─────────────────────────────────────────────────────────────┘
```

**Change Detail View:**
```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIT ENTRY DETAILS                     │
│ Action: Customer Updated                                    │
│ User: manager1 (Jane Doe) at 2025-01-10 14:30:15 UTC      │
│ Entity: Customer #c123 (John Smith)                        │
│                                                             │
│ Changes Made:                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Field    │ Before      │ After           │ Change Type │ │
│ │ phone    │ +123        │ +1234567890     │ Updated     │ │
│ │ tags     │ [regular]   │ [regular, vip]  │ Added       │ │
│ │ district │ null        │ Manhattan       │ Added       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                                            │
│ [< Back to List] [Export Entry] [Related Entries]          │
└─────────────────────────────────────────────────────────────┘
```


### Backend Integration

**API Endpoints (Already implemented):**
- `GET /api/v1/audit/` - Paginated audit logs with filtering
- `GET /api/v1/audit/{id}` - Detailed audit entry
- `GET /api/v1/audit/stats/summary` - Activity statistics

**Filtering Capabilities:**
- By user name or ID
- By action type (created, updated, deleted, etc.)
- By entity type (user, customer, room, booking)  
- By date/time range
- Full-text search in descriptions

---

## UX Flow Design

### Main Application Flow

```
┌─────────────────┐
│   LOGIN PAGE    │ → Role detection
└─────────┬───────┘
          │
    ┌─────▼─────┐
    │ DASHBOARD │ ← Role-specific content
    └─────┬─────┘
          │
   ┌──────▼──────────────────────────┐
   │        MODULE NAVIGATION        │
   │  ┌─────────┐ ┌─────────┐       │
   │  │CALENDAR │ │  ROOMS  │       │ ← Always visible
   │  │(Primary)│ │ Management│     │
   │  └─────────┘ └─────────┘       │
   │  ┌─────────┐                     │
   │  │CUSTOMERS│                   │ ← Always visible  
   │  │Database │                   │
   │  └─────────┘                   │
   │  ┌─────────┐ ┌─────────┐       │
   │  │ USERS   │ │  AUDIT  │       │ ← Admin only
   │  │Management│ │  Logs   │     │
   │  └─────────┘ └─────────┘       │
   └─────────────────────────────────┘
```

### Calendar Module Flow

```
1. CALENDAR ENTRY:
   ┌─────────────────────────────────────────────┐
   │            BOOKING CALENDAR                 │
   │ View: [Week] [Month]  Filters: [Room Type]   │
   │ Quick Actions: [+ New Booking]              │
   │                                             │
   │ ┌─Room─┬─────── Timeline (168hrs) ──────────┐ │
   │ │ 101  │  ██████████          ████████   │ │ ← Bookings
   │ │ 102  │████              ██████████████ │ │ ← Continuous
   │ │ 103  │        ████████████             │ │ ← Flow
   │ └──────┴──────────────────────────────────┘ │
   └─────────────────────────────────────────────┘

2. BOOKING INTERACTION:
   
   a) CLICK EMPTY SLOT → Quick Booking Modal:
   ┌─────────────────────────────────────┐
   │           NEW BOOKING               │
   │ Customer: [Search/Select ▼]         │  
   │ Room: 101 (Pre-filled from row)    │
   │ Time: Jan 5 14:00 - Jan 6 12:00 (Start from click, end next day 12:00) │
   │ Price: $120 (Auto-calculated)      │
   │ Payment: [Cash ▼]                  │
   │ Notes: [Optional...]               │
   │ [Cancel] [Create Booking]          │
   └─────────────────────────────────────┘
   
   Time Calculation Logic:
   ```typescript
   const calculateTimeFromClick = (clickX: number, roomRow: Element) => {
     const timelineWidth = timelineRef.current?.offsetWidth || 1
     const clickPercent = (clickX / timelineWidth) * 100
     
     // Convert to hours from period start
     const totalPeriodHours = viewMode === 'week' ? 168 : 744
     const clickOffsetHours = (clickPercent / 100) * totalPeriodHours
     
     // Calculate actual datetime
     const clickDateTime = new Date(periodStart.getTime() + clickOffsetHours * 60 * 60 * 1000)
     
     // Round to nearest hour for user convenience
     const roundedStart = new Date(clickDateTime)
     roundedStart.setMinutes(0, 0, 0)
     
     // Default checkout: 12:00 next day (standard hotel checkout time)
     const defaultEnd = new Date(roundedStart)
     defaultEnd.setDate(defaultEnd.getDate() + 1) // Next day
     defaultEnd.setHours(12, 0, 0, 0) // 12:00 PM
     
     return {
       check_in: roundedStart,
       check_out: defaultEnd
     }
   }
   ```
   
   b) CLICK BOOKING BLOCK → Action Menu:
   ┌─────────────────┐
   │ • View Details  │
   │ • Edit Booking  │
   │ • Check In      │ ← If confirmed
   │ • Check Out     │ ← If checked-in  
   │ • Cancel        │
   │ • Move/Resize   │
   └─────────────────┘

3. DRAG & DROP (Room Changes Only):
   - Visual feedback with valid drop zones
   - Automatic conflict detection  
   - Time remains unchanged during drag
   - Only room assignment changes
```

### Customer Module Flow

```
1. CUSTOMER LIST VIEW:
   ┌─────────────────────────────────────────────────────────┐
   │                  CUSTOMER DATABASE                      │
   │ [🔍 Search] [Filter: All▼] [Sort: Name▼] [+ Add]       │
   ├─────────────────────────────────────────────────────────┤
   │ Photo │ Name         │ Phone      │ Last Visit │ Total  │
   │ 👤    │ John Smith   │ +123456    │ Jan 5      │ $1,240 │
   │ 👤    │ Jane Doe     │ +654321    │ Jan 3      │ $890   │
   │ 👤    │ Bob Wilson   │ +789123    │ Dec 28     │ $2,100 │
   └─────────────────────────────────────────────────────────┘
   
2. CUSTOMER DETAIL VIEW (Click on row):
   ┌─────────────────────────────────────────────────────────┐
   │                  CUSTOMER PROFILE                       │
   │ ┌─────────┐ John Smith                   [Edit] [Book] │
   │ │ Avatar  │ +1-234-567-8900                            │  
   │ │ Photo   │ john@email.com                             │
   │ └─────────┘ VIP Customer since Jan 2024               │
   │                                                         │
   │ Statistics:          Tags:                              │
   │ • Total Visits: 12   [VIP] [Loyal Customer]            │
   │ • Total Spent: $1,240                                   │
   │ • Average: $103/visit                                   │
   │                                                         │
   │ Recent Bookings:                                        │
   │ ┌─────────────────────────────────────────────────────┐ │
   │ │ Jan 5  │ Room 101 │ $120 │ Checked Out            │ │
   │ │ Dec 20 │ Room 205 │ $180 │ Completed              │ │
   │ │ Nov 15 │ Room 101 │ $110 │ Completed              │ │
   │ └─────────────────────────────────────────────────────┘ │
   │                                                         │
   │ [New Booking] [Edit Customer] [View All Bookings]      │
   └─────────────────────────────────────────────────────────┘

3. CUSTOMER CREATION/EDIT:
   ┌─────────────────────────────────────────────────────────┐
   │                   ADD CUSTOMER                          │
   │ Personal Information:                                   │
   │ First Name: [John           ]  Last Name: [Smith     ]  │
   │ Phone: [+1234567890        ]   Email: [john@email..]   │
   │ Birth Date: [1990-01-01    ]   District: [Manhattan  ]  │
   │                                                         │
   │ Customer Tags:                                          │
   │ ☑ VIP    ☐ Loyal                                        │
   │                                                         │
   │ Documents:                                              │
   │ ┌─────────────────────────────────────────────────────┐ │
   │ │          📷 Upload Passport Photo                   │ │
   │ │              [Drag & Drop Here]                     │ │
   │ └─────────────────────────────────────────────────────┘ │
   │                                                         │
   │ Notes:                                                  │
   │ [Free text area for additional information...]          │
   │                                                         │
   │ [Cancel] [Save Customer]                               │
   └─────────────────────────────────────────────────────────┘
```

---

## WowDash Template Mapping

### Template to Component Mapping

| Hotel CRM Component | WowDash Template | Key Features Extracted |
|-------------------|------------------|----------------------|
| **Login Page** | `sign-in.html` | Two-column layout, icon inputs, auth forms |
| **Dashboard** | `index.html`, `index-2.html`, `widgets.html` | Stats cards, KPI widgets with trends, metric charts, gradient backgrounds |
| **Calendar Grid** | Custom implementation | Time continuum layout + percentage positioning (no suitable WowDash template) |
| **Room Cards** | `card.html` | Image-based cards, flexible layouts, action buttons, status indicators |
| **Room List** | `table-data.html` | Data tables, action buttons, filtering |
| **Customer List** | `users-list.html` | User tables, search, pagination |
| **Customer Profile** | `view-profile.html` | Profile layouts, tabs, activity feeds |
| **User Management** | `add-user.html` | User creation forms, role selection |
| **Audit Table** | `table-data.html` | Advanced tables, filtering, export |
| **Navigation** | `_sidebar.html`, `_nav.html` | Sidebar menus, breadcrumbs, user dropdown |
| **Modals** | Various | Quick booking modal (calendar), confirmations, detail views |

### Key Design Patterns Extracted

**Color System:**
```css
/* Status Colors */
.available { @apply bg-success-100 text-success-600 border-success-200; }
.occupied { @apply bg-danger-100 text-danger-600 border-danger-200; }
.cleaning { @apply bg-warning-100 text-warning-600 border-warning-200; }
.maintenance { @apply bg-purple-100 text-purple-600 border-purple-200; }

/* Role-based UI */
.admin-only { @apply bg-gradient-to-r from-primary-600 to-info-600; }
.manager-badge { @apply bg-success-100 text-success-700; }
.host-badge { @apply bg-cyan-100 text-cyan-700; }
```

**Component Patterns:**
```jsx
// Status Badge Component (from badges.html)
const StatusBadge = ({ status, children }) => (
  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClasses(status)}`}>
    {children}
  </span>
)

// Action Button Group (from table-data.html) 
const ActionButtons = ({ onView, onEdit, onDelete, permissions }) => (
  <div className="flex items-center gap-2">
    <button className="w-8 h-8 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center">
      <Eye className="w-4 h-4" />
    </button>
    {permissions.canEdit && (
      <button className="w-8 h-8 bg-success-50 text-success-600 rounded-full flex items-center justify-center">
        <Edit className="w-4 h-4" />
      </button>
    )}
  </div>
)

// Card Layout (from card.html + users-grid.html)
const DataCard = ({ title, value, trend, icon: Icon }) => (
  <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-neutral-600">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <Icon className="w-8 h-8 text-primary-600" />
    </div>
  </div>
)
```

---

## Component-by-Component Implementation Plan

### 🎯 Implementation Strategy

**Each component is:**
1. Completed fully (UI + functionality + types)
2. Tested and verified by user
3. Only then proceed to next component

**No partial implementations** - each component must be production-ready before moving on.

---

## COMPONENT 1: Login Page 
**Confidence:** ✅ High  
**Templates:** `pages/sign-in.html`

**What to build:**
- Login form with username/password
- JWT token management  
- Role detection (Admin/Manager/Host)
- Redirect to role-appropriate dashboard
- Basic error handling

**API Integration:**
- `POST /api/v1/login/access-token`
- `POST /api/v1/login/test-token`

**WowDash Patterns:**
- Two-column layout with illustration
- Icon input fields 
- Form validation styling
- Responsive design

---

## COMPONENT 2: Main Layout + Sidebar
**Confidence:** ✅ High  
**Templates:** `layouts/_sidebar.html`, `layouts/_nav.html`

**What to build:**
- Responsive sidebar with role-based menu items
- Top navigation with user profile dropdown
- Breadcrumb navigation
- Dark mode toggle
- Logout functionality

**Role-based Navigation:**
- **Admin:** All modules visible
- **Manager:** No Users/Audit/Analytics
- **Host:** No Users/Audit/Analytics/Room Editing

**Research needed:** Dark mode implementation in WowDash

---

## COMPONENT 3: Basic Dashboard (Role-specific)
**Confidence:** ✅ High  
**Templates:** `pages/index.html`, `pages/index-2.html`, `pages/widgets.html`

**What to build:**
- **Admin:** System stats, user activity, revenue metrics
- **Manager:** Room occupancy, today's bookings, revenue  
- **Host:** Today's check-ins/outs, pending tasks

**API Integration:**
- Basic stats from existing endpoints
- Real-time data with TanStack Query

**WowDash Patterns:**
- Stats cards with icons
- Simple charts (recharts)
- Grid layouts

---

## COMPONENT 4: Customer List 
**Confidence:** ✅ High  
**Templates:** `pages/users-list.html`

**What to build:**
- Customer table with search/filtering
- Pagination 
- Customer creation modal
- Basic customer editing
- Role permissions (all roles can manage customers)

**API Integration:**
- `GET /api/v1/customers/` with search params
- `POST /api/v1/customers/`
- `PUT /api/v1/customers/{id}`

**WowDash Patterns:**
- Data table with action buttons
- Search and filter UI
- Modal forms

---

## COMPONENT 5: Customer Profile
**Confidence:** ✅ High  
**Templates:** `pages/view-profile.html`

**What to build:**
- Individual customer page
- Booking history display
- Customer statistics
- Edit customer details
- Basic photo upload placeholder

**API Integration:**
- `GET /api/v1/customers/{id}`
- Customer's booking history

**File Upload:** Research needed for photo implementation

---

## COMPONENT 6: Room Management  
**Confidence:** ✅ High  
**Templates:** `pages/card.html` (image-based cards with actions)

**What to build:**
- Room grid/list view
- Room creation/editing (Admin/Manager only)
- Status management (Available/Occupied/Cleaning/Maintenance)
- Role-based permissions (Host: read-only)
- Basic room photos placeholder

**API Integration:**
- `GET /api/v1/rooms/`
- `POST /api/v1/rooms/` (Admin/Manager)
- `PUT /api/v1/rooms/{id}` (Admin/Manager)

---

## COMPONENT 7: User Management (Admin Only)
**Confidence:** ✅ High  
**Templates:** `pages/add-user.html`, `pages/users-list.html`

**What to build:**
- User list (Admin only)
- User creation with role selection
- Basic user editing
- Permission validation

**API Integration:**
- `GET /api/v1/users/` (Admin only)
- `POST /api/v1/users/` (Admin only)

---

## COMPONENT 8: Calendar Grid (Research Phase)
**Confidence:** ❓ Medium (requires research)  
**Templates:** Custom implementation (calendar-main.html not suitable - uses FullCalendar for events, not room-based continuum)

**Research Phase:**
1. Percentage-based positioning for time continuum
2. HTML5 Drag & Drop API for room changes only
3. Touch events for mobile
4. Real-time sync strategy

**What to build:**
- Time continuum container (25 rooms × timeline)
- Booking block visualization with percentage positioning
- Click-to-create booking interactions
- Time scale markers and room headers

**Major Research Areas:**
- Dynamic percentage positioning calculations
- Conflict detection UI
- Performance with multiple bookings

---

## COMPONENT 9: Calendar Interactions  
**Confidence:** ❓ Medium (depends on Component 8 research)

**What to build:**
- Click to create booking
  - **Quick booking modal:** Customer search/create + time selection + room (pre-filled)
- Booking detail tooltips
- Status-based coloring
- Basic drag & drop for room changes only (research dependent)


---

## COMPONENT 10: Audit Module (Admin Only)
**Confidence:** ✅ High  
**Templates:** `pages/table-data.html`

**What to build:**
- Audit log table with filtering
- Change detail viewer
- Basic statistics
- Export functionality (research needed)

**API Integration:**
- `GET /api/v1/audit/` (Admin only)
- `GET /api/v1/audit/stats/summary`

**Research needed:** JSON diff viewer implementation

---

## Flexibility & Iteration

**Key Principle:** If any component proves more complex than expected, we break it down further or research first.

**Example:** If Calendar Grid (Component 8) research shows high complexity, we split into:
- 8a: Static Grid Layout
- 8b: Booking Block Positioning  
- 8c: Interaction Layer
- 8d: Drag & Drop

**User Check Points:** After each component, full functionality demo and approval before proceeding.

---

## Technical Architecture

### Frontend Stack
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS + WowDash design system
- **State Management:** TanStack Query v5 + Zustand
- **Routing:** React Router v7 with role-based guards
- **Icons:** Lucide React (replacing Iconify)
- **Charts:** Recharts (replacing ApexCharts)
- **Date Handling:** date-fns
- **Forms:** React Hook Form + Zod validation

### Backend Integration (FastAPI)
- **API Client:** Auto-generated TypeScript client from OpenAPI
- **Authentication:** JWT with automatic refresh
- **Real-time:** Server-Sent Events for calendar updates
- **File Upload:** Multipart forms for photos/documents
- **Caching:** React Query with smart invalidation

### Calendar-Specific Architecture

**Component Hierarchy:**
```
HotelCalendar/
├── CalendarContainer.tsx        # Main orchestrator
├── CalendarHeader.tsx           # Navigation, filters, actions
├── TimeScale.tsx                # Timeline markers (week/month ticks)  
├── RoomSidebar.tsx              # Room list with statuses
├── CalendarGrid.tsx             # Main booking grid
│   ├── BookingBlock.tsx         # Individual booking
│   ├── AvailableSlot.tsx        # Empty clickable slots  
│   ├── ConflictIndicator.tsx    # Overlap warnings
│   └── DropZone.tsx             # Drag target areas
├── BookingModal.tsx             # Create/edit booking
├── QuickActions.tsx             # Toolbar with common actions
└── BookingTooltip.tsx           # Hover details
```

**State Management:**
```typescript
// Calendar Store (Zustand)
interface CalendarState {
  // View state
  currentDate: Date
  viewMode: 'week' | 'month'
  selectedRooms: string[]
  
  // Data
  rooms: Room[]
  bookings: BookingBlock[]
  customers: Customer[]
  
  // UI state
  draggedBooking: BookingBlock | null
  selectedBooking: BookingBlock | null  
  conflictingBookings: BookingBlock[]
  
  // Permissions
  userRole: UserRole
  permissions: PermissionSet
}
```

### Database Optimization (Max 25 Rooms)

**Simplified Queries:**
- No pagination needed for rooms (always ≤25)
- Simple in-memory sorting and filtering  
- Aggressive caching with short TTL
- Real-time updates via WebSocket/SSE

**API Optimization:**
```typescript
// Use existing booking endpoints with filtering
GET /api/v1/bookings/?date_from=2025-01-06&date_to=2025-01-13  // Week
GET /api/v1/rooms/                                              // All rooms
Response: {
  rooms: Room[],           // All 25 rooms from rooms endpoint
  bookings: BookingBlock[], // Filtered bookings from bookings endpoint
}
```

### Security Considerations

**Role-Based Security:**
- JWT tokens with role claims
- Route-level permission guards
- Component-level permission checks
- API endpoint protection with role validation

**Audit Trail:**
- All CRUD operations logged
- Before/after state capture
- User session tracking
- IP address and browser logging

**Data Protection:**
- Customer PII encryption at rest
- Secure file upload validation
- XSS protection with proper sanitization
- CSRF protection on state-changing operations

---

## Success Metrics

### Technical Metrics
- **Calendar Performance:** <100ms interaction response time
- **Data Loading:** <2s full calendar load (25 rooms × 7 days)
- **Real-time Sync:** <1s booking update propagation
- **Mobile Responsiveness:** 100% feature parity on tablet/mobile

### Business Metrics  
- **User Adoption:** 100% staff usage within 2 weeks
- **Booking Efficiency:** 50% reduction in booking creation time
- **Error Reduction:** 90% reduction in double-booking incidents
- **Audit Compliance:** 100% action traceability

### User Experience Metrics
- **Learning Curve:** <30 minutes for new user onboarding
- **Task Completion:** <5 clicks for common booking operations
- **Error Recovery:** <10 seconds to resolve booking conflicts
- **Accessibility:** WCAG 2.1 AA compliance

---

## Risk Mitigation

### Technical Risks
- **Calendar Complexity:** Gradual implementation with MVP first
- **Real-time Sync:** Graceful degradation to manual refresh
- **Mobile Performance:** Progressive Web App fallback
- **Data Loss:** Optimistic updates with server confirmation

### Business Risks  
- **User Resistance:** Comprehensive training and gradual rollout
- **Data Migration:** Parallel systems during transition
- **Downtime:** Blue-green deployment strategy
- **Compliance:** Regular security audits and penetration testing

### Operational Risks
- **Staff Training:** Role-specific training materials
- **Process Changes:** Change management with stakeholder buy-in
- **System Dependencies:** Offline-first design for critical operations
- **Scalability:** Architecture ready for >25 rooms if needed

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building a modern, role-based Hotel CRM system with a unique time continuum booking calendar. The combination of the existing robust FastAPI backend and the WowDash design system creates a solid foundation for rapid development.

**Key Success Factors:**
1. **Proven Backend:** 90% of backend functionality already implemented
2. **Simplified Scale:** ≤25 rooms eliminates complex virtualization needs  
3. **Clear Role Model:** Well-defined permissions reduce development complexity
4. **Design System:** WowDash templates provide consistent, proven UI patterns
5. **Phased Approach:** Risk mitigation through incremental delivery

**Timeline:** 10-13 weeks for complete implementation  
**Team Required:** 1-2 fullstack developers + 1 designer  
**Technical Risk:** Low (proven technologies, clear requirements)
**Business Impact:** High (significant operational efficiency gains)

The time continuum calendar represents a significant competitive advantage over traditional daily-view booking systems, providing unprecedented visibility into room utilization and operational efficiency with natural time flow visualization.