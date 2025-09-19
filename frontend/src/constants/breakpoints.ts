/**
 * Standard Tailwind CSS breakpoints
 * Used for JavaScript/TypeScript logic that needs to match CSS breakpoints
 *
 * These values must match tailwind.config.js exactly to ensure consistency
 * between CSS and JS breakpoint detection
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const

/**
 * Large screen layout constraints
 * Used for optimizing the booking grid experience on ultra-wide displays
 */
export const LARGE_SCREEN_LIMITS = {
  MAX_TIMELINE_WIDTH: 1400,        // Maximum timeline width to prevent over-stretching
  MAX_DAY_WIDTH: 200,              // Maximum day column width for readability
  OPTIMAL_CONTAINER_WIDTH: 1600,   // Optimal content container width
  MAX_CONTENT_WIDTH: 1920,         // Maximum content width before centering
} as const

/**
 * Responsive grid states for 4-state system
 */
export const GRID_STATES = {
  mobile: { min: 0, max: BREAKPOINTS.md - 1 },      // < 768px
  tablet: { min: BREAKPOINTS.md, max: BREAKPOINTS.lg - 1 }, // 768px - 1023px
  desktop: { min: BREAKPOINTS.lg, max: BREAKPOINTS["2xl"] - 1 }, // 1024px - 1535px
  large: { min: BREAKPOINTS["2xl"], max: Infinity }, // ≥ 1536px
} as const

export type Breakpoint = keyof typeof BREAKPOINTS
export type GridState = keyof typeof GRID_STATES
