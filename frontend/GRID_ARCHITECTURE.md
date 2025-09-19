# Booking Grid Architecture

## Core Architecture Principles

### 1. Three-State Responsive System
```
Mobile:  < 768px  (md breakpoint)
Tablet:  768-1279px
Desktop: ≥ 1280px (xl breakpoint)
```

**Key Insight**: No intermediate states. The 1200-1280px zone is just part of tablet state, not a separate state.

### 2. Container-Based Layout Calculation
```typescript
// WRONG: Using viewport width directly
const gridWidth = viewportWidth - padding

// RIGHT: Calculate container width first
const containerWidth = hasSidebar ?
  viewportWidth - SIDEBAR_WIDTH :
  viewportWidth
const gridWidth = containerWidth - padding
```

**Pattern**: Always calculate from container, not viewport. Sidebar switches from `fixed` (mobile) to `static` (desktop) at xl:1280px.

### 3. Dynamic Zoom System

#### Core Formula
```typescript
dayWidth = (availableWidth / actualDaysInView) * zoomLevel
```
- At zoom 1.0: All days fit exactly in available width
- At zoom 7.0 (week): Single day fills viewport
- At zoom 30.0 (month): Single day fills viewport

#### Zoom Persistence
- Separate zoom levels for week/month views
- Stored in localStorage: `booking-grid-zoom-week`, `booking-grid-zoom-month`
- Each view mode remembers its zoom independently

### 4. Centralized Breakpoint Constants
```typescript
// frontend/src/constants/breakpoints.ts
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const
```

**Anti-pattern avoided**: Never hardcode breakpoint values. Always reference constants.

## Implementation Patterns

### 1. Responsive Split Pattern
```tsx
{/* Mobile view */}
<div className="block md:hidden">
  <MobileBookingList />
</div>

{/* Desktop/Tablet view */}
<div className="hidden md:block">
  <GridWithTimeline />
</div>
```

### 2. CSS Grid for Timeline
```css
display: grid;
grid-template-columns: 200px 1fr; /* Room column + timeline */
```

**Why CSS Grid**: Precise control over column widths, better than flexbox for this use case.

### 3. Touch Detection for Drag-n-Drop
```typescript
const isTouchDevice = "ontouchstart" in window ||
                      navigator.maxTouchPoints > 0
```
Only enable drag-n-drop on non-touch devices.

### 4. React Context for Global State
- `GridZoomContext`: Manages zoom levels, dimensions, view dates
- `useViewportWidth`: Reactive viewport width with debouncing
- `useMediaQuery`: Responsive breakpoint detection in JavaScript

## Key Architectural Decisions

### 1. No Magic Numbers
All layout constants defined in one place:
```typescript
const LAYOUT_CONSTANTS = {
  ROOM_COLUMN_WIDTH: 200,
  SIDEBAR_WIDTH_LG: 256,     // w-64
  MAIN_CONTAINER_PADDING: 48, // p-6 * 2
  MIN_TIMELINE_WIDTH: 400,
} as const
```

### 2. Actual Days vs Fixed Days
```typescript
// Calculate real days in view
const actualDaysInView = differenceInDays(viewEnd, viewStart) + 1
// Use actual days for all calculations, not hardcoded 7 or 30
```

### 3. Smooth Transitions
- No intermediate breakpoints (avoid lg-plus pattern)
- Use standard Tailwind breakpoints only
- Layout changes happen at clear, predictable points

### 4. Performance Optimizations
- Debounced viewport resize (150ms)
- Memoized calculations with useMemo
- React.memo for heavy components
- overflow-x-auto for smooth horizontal scrolling

## Common Pitfalls Avoided

1. **Don't create custom breakpoints** - Use Tailwind standards
2. **Don't calculate from viewport when sidebar affects layout** - Use container width
3. **Don't round dayWidth prematurely** - Maintain precision for smooth zoom
4. **Don't assume fixed days** - February has 28/29, months vary
5. **Don't mix responsive logic** - Keep CSS (Tailwind) and JS (hooks) separate

## Testing Checklist

- [ ] Resize from 320px to 2560px - no layout breaks
- [ ] Zoom in/out smoothly in both week/month views
- [ ] Sidebar transitions correctly at 1280px
- [ ] Month view handles 28, 29, 30, 31 day months
- [ ] LocalStorage persists zoom per view mode
- [ ] Touch devices don't show drag cursors
- [ ] Grid scrolls horizontally when zoomed in

## Migration Strategy (for future reference)

When migrating breakpoints:
1. Create constants first
2. Update one breakpoint at a time
3. Test at boundary conditions (±1px from breakpoint)
4. Remove temporary code immediately after migration
5. Never leave "костыли" (temporary hacks) in production