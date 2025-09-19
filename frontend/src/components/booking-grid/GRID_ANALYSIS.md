# Booking Grid Component Analysis

## Responsive Design & Breakpoints

### Breakpoint System (tailwind.config.js)
```javascript
screens: {
  sm: "576px",   // Small devices
  md: "768px",   // Tablets (KEY BREAKPOINT for grid)
  lg: "992px",   // Desktop
  xl: "1200px",  // Wide desktop (sidebar becomes static)
  "2xl": "1400px",
  "3xl": "1650px"
}
```

### Key Responsive Behaviors

#### Mobile (<768px)
- **Display**: Vertical list view (MobileBookingList)
- **Layout**: Cards organized by day
- **Interactions**: Tap to select, no drag-and-drop
- **Features**: Simplified controls, no zoom, no filters

#### Tablet/Desktop (≥768px)
- **Display**: CSS Grid timeline view
- **Layout**: Horizontal timeline with room rows
- **Interactions**: Click, hover, drag-and-drop
- **Features**: Full controls, zoom, filters, stats

### Critical Breakpoints in Code

```tsx
// BookingGrid.tsx - Main responsive split
<div className="block md:hidden"> {/* Mobile */}
  <MobileBookingList />
</div>
<div className="hidden md:block"> {/* Desktop/Tablet */}
  {/* Grid with timeline */}
</div>

// GridControls.tsx - Controls visibility
<div className="hidden md:block"> {/* Hide on mobile */}
  <GridControls />
</div>

// GridHeader.tsx - Different layouts
<div className="md:hidden"> {/* Mobile layout */}
<div className="hidden md:flex"> {/* Desktop layout */}
```

## Component States

### 1. Booking States (BookingStatus)
```typescript
type BookingStatus =
  | "confirmed"    // Green - can be dragged
  | "checked_in"   // Blue - cannot be dragged
  | "checked_out"  // Gray/Violet - cannot be dragged
  | "cancelled"    // Red - cannot be dragged
```

### 2. Room States (RoomStatus)
```typescript
type RoomStatus =
  | "available"    // Can receive bookings
  | "occupied"     // Currently has guest
  | "cleaning"     // Being cleaned
  | "maintenance"  // Hidden from grid
```

### 3. Interaction States

#### Booking Block States
- **Default**: Normal display with status color
- **Hover**: Shadow increases, z-index elevated
- **Selected**: Ring border (ring-2 ring-primary-500)
- **Dragging**: Opacity 50%, cursor-grabbing
- **Draggable**: Only "confirmed" bookings on non-touch devices

#### Room Timeline States
- **Default**: White/dark background
- **Hover**: Light gray background (hover:bg-neutral-50)
- **Drop Target Valid**: Green background (bg-green-50)
- **Drop Target Invalid**: Red background (bg-red-50)

### 4. View States
```typescript
type ViewMode = "week" | "month"
// Week: 7 days visible
// Month: 28-31 days visible (actual calendar days)
```

### 5. Filter States
- **Search**: Text filter for guest names
- **Status Filters**: Multi-select booking statuses
- **Room Type Filters**: Multi-select room types
- **Active Filters**: Visual indicator with count badges

## Zoom System

### Zoom Behavior
```typescript
// Dynamic zoom where 100% = entire grid fits viewport
MIN_ZOOM = 1.0     // Entire timeline visible
DEFAULT_ZOOM = 1.0 // Default state
MAX_ZOOM_WEEK = 7.0   // One day fills viewport
MAX_ZOOM_MONTH = 28-31 // One day fills viewport

// Zoom affects:
dayWidth = (availableWidth / actualDaysInView) * zoomLevel
roomHeight = 64 + (zoomLevel - 1) * 16
fontSize = 10-14px based on zoom level
```

### Zoom Presets
1. **Fit All** (100%): Entire grid visible
2. **Half View** (200%): Half of grid visible
3. **Quarter View** (400%): Quarter visible
4. **Single Day** (700%): Focus on one day

## Mobile vs Desktop Differences

### Mobile (<768px)
```tsx
// Component: MobileBookingList
- Vertical card layout
- Grouped by day with sticky headers
- Simplified interactions (tap only)
- No drag-and-drop
- No zoom controls
- No filters visible
- Compact header with essential controls
- Touch-optimized (min-height: 44px)
```

### Desktop (≥768px)
```tsx
// Component: Grid with RoomTimeline
- Horizontal timeline grid
- CSS Grid layout
- Full mouse interactions
- Drag-and-drop enabled
- Zoom controls (xl breakpoint)
- Filter bar visible
- Extended header with all controls
- Hover states and tooltips
```

## Layout Calculations

### Available Width Calculation
```typescript
// GridZoomContext.tsx
if (viewportWidth >= 1200) { // xl breakpoint
  containerWidth = viewportWidth - 256 // Minus sidebar
} else {
  containerWidth = viewportWidth // Full width
}

timelineWidth = containerWidth - 48 - 200 // Minus padding & room column
```

### Grid Structure
```css
grid-template-columns: 200px [timeline-width]px;
/* 200px: Fixed room column */
/* Dynamic: Timeline based on zoom & days */
```

## Touch Device Detection
```typescript
// Only for drag-and-drop, NOT for responsive layout
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

// Disables:
- Drag-and-drop interactions
- Hover tooltips
- Mouse-specific features

// Enables:
- Touch-friendly tap targets (min 44px)
- Simplified interactions
```

## Performance Optimizations

1. **Memoization**: Components use React.memo
2. **Virtual Scrolling**: Not implemented (potential improvement)
3. **Debounced Search**: 300ms delay on typing
4. **Conditional Rendering**: Mobile/Desktop split prevents unnecessary renders
5. **CSS Transforms**: Used for smooth animations
6. **Zoom Persistence**: Stored in localStorage per view mode

## State Management

### Global State (Context)
- **GridZoomContext**: Zoom level, dimensions, view dates
- Persisted in localStorage

### Local State (Component)
- **BookingGrid**: Current date, view mode, filters, modals
- **GridControls**: Dropdown visibility
- **GridHeader**: Zoom preset menu

### Query State (TanStack Query)
- **Rooms**: Cached API data
- **Bookings**: Cached per date range

## Key Design Patterns

1. **Progressive Enhancement**: Full features on desktop, simplified on mobile
2. **Responsive First**: Mobile layout is completely different component
3. **Touch-First Interactions**: 44px minimum touch targets
4. **Context-Aware Rendering**: Components adapt based on viewport and device
5. **Smart Text Fitting**: Dynamic text truncation based on available space

## Accessibility Features

- ARIA labels on interactive elements
- Keyboard navigation support (tabIndex)
- Semantic HTML structure
- Color contrast for status indicators
- Focus visible states
```