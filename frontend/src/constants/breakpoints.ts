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

// Legacy and transition breakpoints removed - migration to standard Tailwind complete

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