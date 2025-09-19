/**
 * Standard Tailwind CSS breakpoints
 * Used for JavaScript/TypeScript logic that needs to match CSS breakpoints
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * Legacy breakpoints for migration period
 * Will be removed after complete migration
 */
export const LEGACY_BREAKPOINTS = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  "2xl": 1400,
  "3xl": 1650,
} as const

/**
 * Temporary breakpoint for smooth xl migration
 * Maps to old xl (1200px) during transition period
 */
export const TRANSITION_BREAKPOINTS = {
  "lg-plus": 1200, // Old xl value for critical components
} as const

/**
 * Helper to check if viewport is at least the specified breakpoint
 */
export function isBreakpoint(width: number, breakpoint: Breakpoint): boolean {
  return width >= BREAKPOINTS[breakpoint]
}

/**
 * Get current breakpoint based on viewport width
 */
export function getCurrentBreakpoint(width: number): Breakpoint | null {
  if (width >= BREAKPOINTS["2xl"]) return "2xl"
  if (width >= BREAKPOINTS.xl) return "xl"
  if (width >= BREAKPOINTS.lg) return "lg"
  if (width >= BREAKPOINTS.md) return "md"
  if (width >= BREAKPOINTS.sm) return "sm"
  return null
}