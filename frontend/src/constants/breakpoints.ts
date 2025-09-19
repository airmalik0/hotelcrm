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

export type Breakpoint = keyof typeof BREAKPOINTS
