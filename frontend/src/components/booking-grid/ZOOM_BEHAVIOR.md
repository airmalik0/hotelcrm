# Zoom Behavior Documentation

## Dynamic Responsive Zoom System

The booking grid zoom system is fully responsive where **100% zoom always means the entire grid fits perfectly in the viewport**, regardless of screen size.

## Core Principles

- **100% Zoom** = Entire grid visible (all days fit exactly in viewport)
- **Minimum Zoom** = 100% (can't zoom out beyond full grid view)
- **Maximum Zoom** = When 1 day fills the entire viewport
- **Responsive** = Automatically adjusts to window resizing

## Week View Behavior

| Zoom Level | Days Visible | Description |
|------------|-------------|-------------|
| 100% (min) | 7 days      | Full week fits viewport exactly |
| 200%       | 3.5 days    | Half week visible |
| 400%       | 1.75 days   | Quarter week visible |
| 700% (max) | 1 day       | Single day fills viewport |

## Month View Behavior

| Zoom Level | Days Visible | Description |
|------------|-------------|-------------|
| 100% (min) | 28-31 days  | Full month fits viewport exactly |
| 200%       | 14-15 days  | Half month visible |
| 400%       | 7-8 days    | Week visible |
| ~3000% (max)| 1 day      | Single day fills viewport |

**Note**: Month view maximum zoom varies (2800%-3100%) based on actual days in the month.

## Mathematical Formula

```javascript
// Dynamic responsive calculation
// Step 1: Calculate grid available width
// Note: Sidebar (256px) only subtracted when viewport >= 1200px (xl breakpoint)
if (viewportWidth >= 1200) {
  gridAvailableWidth = viewportWidth - sidebar(256px) - mainPadding(48px)
} else {
  gridAvailableWidth = viewportWidth - mainPadding(48px) // Sidebar is overlapping
}

// Step 2: Calculate timeline available width (excluding fixed room column)
timelineAvailableWidth = gridAvailableWidth - roomColumn(200px)

// Step 3: Calculate day width based on zoom
dayWidth = (timelineAvailableWidth / actualDaysInView) * zoomLevel

// Total grid width
totalGridWidth = roomColumn(200px) + (dayWidth * actualDaysInView)

// Week View Example (1920px screen, >= 1200px so sidebar is static)
gridAvailableWidth = 1920 - 256 - 48 = 1616px
timelineAvailableWidth = 1616 - 200 = 1416px
dayWidth@100% = 1416 / 7 = 202.29px per day
dayWidth@700% = 202.29 * 7 = 1416px (1 day fills timeline)

// Mobile/Tablet Example (1100px screen, < 1200px so sidebar overlaps)
gridAvailableWidth = 1100 - 48 = 1052px
timelineAvailableWidth = 1052 - 200 = 852px
dayWidth@100% = 852 / 7 = 121.71px per day
```

## Responsive Behavior

- **Window Resize**: Grid automatically recalculates to maintain zoom percentage
- **Small Screens**: Days become narrower but still fit at 100% zoom
- **Large Screens**: Days become wider but still fit at 100% zoom
- **Consistency**: 100% always means "see everything" on any screen

## User Controls

- **Ctrl/Cmd + Mouse Wheel**: Zoom with mouse cursor as focal point
- **Ctrl/Cmd + Plus/Minus**: Zoom in/out via keyboard
- **Ctrl/Cmd + 0**: Reset to 100% zoom (fit all)
- **UI Buttons**: Click zoom controls in header (desktop only)
- **Touch Pinch**: Pinch to zoom on tablets
- **Zoom Presets**: Quick jump to common zoom levels

## Zoom Presets

| Preset | Scale | Description |
|--------|-------|-------------|
| Fit All | 100% | Entire grid visible |
| Half View | 200% | Half of grid visible |
| Quarter View | 400% | Quarter of grid visible |
| Single Day | 700% | Focus on one day (week view) |

## Implementation Details

- **Minimum Zoom**: Always 1.0 (100%)
- **Maximum Zoom**: Dynamic (7x for week, 28-31x for month)
- **Zoom Step**: 10% increments
- **Persistence**: Separate zoom levels for week/month saved to localStorage
- **Mobile**: Grid switches to vertical list view (no zoom controls)