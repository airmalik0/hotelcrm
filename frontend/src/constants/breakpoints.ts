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
 * Responsive grid states for 3-state system
 */
export const GRID_STATES = {
  mobile: { min: 0, max: BREAKPOINTS.md - 1 },           // < 768px
  tablet: { min: BREAKPOINTS.md, max: BREAKPOINTS.xl - 1 }, // 768px - 1279px
  desktop: { min: BREAKPOINTS.xl, max: Infinity },          // ≥ 1280px
} as const

export type Breakpoint = keyof typeof BREAKPOINTS
export type GridState = keyof typeof GRID_STATES
