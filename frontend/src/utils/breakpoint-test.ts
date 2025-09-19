/**
 * Utility to test responsive behavior at different viewport widths
 * Particularly focused on the critical 1200-1280px transition zone
 */

import { BREAKPOINTS, TRANSITION_BREAKPOINTS } from "@/constants/breakpoints"

export interface ResponsiveTestPoint {
  width: number
  label: string
  description: string
  expectedBehavior: {
    sidebar: "hidden" | "static"
    zoomControls: "hidden" | "visible"
    statusFilters: "dropdown" | "inline"
    searchWidth: "normal" | "expanded"
    gridColumns?: number
  }
}

// Critical test points for responsive behavior
export const RESPONSIVE_TEST_POINTS: ResponsiveTestPoint[] = [
  // Mobile
  {
    width: 320,
    label: "Mobile Small",
    description: "iPhone SE size",
    expectedBehavior: {
      sidebar: "hidden",
      zoomControls: "hidden",
      statusFilters: "dropdown",
      searchWidth: "normal",
    },
  },
  {
    width: 639,
    label: "Mobile Large",
    description: "Just before sm breakpoint",
    expectedBehavior: {
      sidebar: "hidden",
      zoomControls: "hidden",
      statusFilters: "dropdown",
      searchWidth: "normal",
    },
  },
  // sm breakpoint
  {
    width: 640,
    label: "sm Start",
    description: "Small breakpoint start",
    expectedBehavior: {
      sidebar: "hidden",
      zoomControls: "hidden",
      statusFilters: "dropdown",
      searchWidth: "normal",
    },
  },
  {
    width: 767,
    label: "sm End",
    description: "Just before md breakpoint",
    expectedBehavior: {
      sidebar: "hidden",
      zoomControls: "hidden",
      statusFilters: "dropdown",
      searchWidth: "normal",
    },
  },
  // md breakpoint - CRITICAL for grid switch
  {
    width: 768,
    label: "md Start (Grid Switch)",
    description: "Desktop grid appears",
    expectedBehavior: {
      sidebar: "hidden",
      zoomControls: "hidden",
      statusFilters: "dropdown",
      searchWidth: "normal",
    },
  },
  {
    width: 1023,
    label: "md End",
    description: "Just before lg breakpoint",
    expectedBehavior: {
      sidebar: "hidden",
      zoomControls: "hidden",
      statusFilters: "dropdown",
      searchWidth: "normal",
    },
  },
  // lg breakpoint
  {
    width: 1024,
    label: "lg Start",
    description: "Large breakpoint start",
    expectedBehavior: {
      sidebar: "hidden",
      zoomControls: "hidden",
      statusFilters: "dropdown",
      searchWidth: "normal",
      gridColumns: 3,
    },
  },
  {
    width: 1199,
    label: "lg End",
    description: "Just before lg-plus",
    expectedBehavior: {
      sidebar: "hidden",
      zoomControls: "hidden",
      statusFilters: "dropdown",
      searchWidth: "normal",
      gridColumns: 3,
    },
  },
  // lg-plus breakpoint - CRITICAL TRANSITION ZONE
  {
    width: 1200,
    label: "lg-plus Start ⚠️",
    description: "Sidebar becomes static, zoom appears",
    expectedBehavior: {
      sidebar: "static",
      zoomControls: "visible",
      statusFilters: "inline",
      searchWidth: "normal",
      gridColumns: 3,
    },
  },
  {
    width: 1240,
    label: "Transition Zone",
    description: "Between lg-plus and xl",
    expectedBehavior: {
      sidebar: "static",
      zoomControls: "visible",
      statusFilters: "inline",
      searchWidth: "normal",
      gridColumns: 3,
    },
  },
  {
    width: 1279,
    label: "lg-plus End",
    description: "Just before xl",
    expectedBehavior: {
      sidebar: "static",
      zoomControls: "visible",
      statusFilters: "inline",
      searchWidth: "normal",
      gridColumns: 3,
    },
  },
  // xl breakpoint
  {
    width: 1280,
    label: "xl Start",
    description: "Search expands, stats appear",
    expectedBehavior: {
      sidebar: "static",
      zoomControls: "visible",
      statusFilters: "inline",
      searchWidth: "expanded",
      gridColumns: 4,
    },
  },
  {
    width: 1440,
    label: "xl Mid",
    description: "Common laptop size",
    expectedBehavior: {
      sidebar: "static",
      zoomControls: "visible",
      statusFilters: "inline",
      searchWidth: "expanded",
      gridColumns: 4,
    },
  },
  {
    width: 1535,
    label: "xl End",
    description: "Just before 2xl",
    expectedBehavior: {
      sidebar: "static",
      zoomControls: "visible",
      statusFilters: "inline",
      searchWidth: "expanded",
      gridColumns: 4,
    },
  },
  // 2xl breakpoint
  {
    width: 1536,
    label: "2xl Start",
    description: "Extra large screens",
    expectedBehavior: {
      sidebar: "static",
      zoomControls: "visible",
      statusFilters: "inline",
      searchWidth: "expanded",
      gridColumns: 4,
    },
  },
  {
    width: 1920,
    label: "Full HD",
    description: "1080p displays",
    expectedBehavior: {
      sidebar: "static",
      zoomControls: "visible",
      statusFilters: "inline",
      searchWidth: "expanded",
      gridColumns: 4,
    },
  },
]

/**
 * Test helper to check if current behavior matches expected
 */
export function validateResponsiveBehavior(
  width: number,
  actualBehavior: ResponsiveTestPoint["expectedBehavior"],
): { isValid: boolean; errors: string[] } {
  const testPoint = RESPONSIVE_TEST_POINTS.find((tp) => tp.width === width)
  if (!testPoint) {
    return { isValid: false, errors: ["No test point defined for this width"] }
  }

  const errors: string[] = []
  const expected = testPoint.expectedBehavior

  if (actualBehavior.sidebar !== expected.sidebar) {
    errors.push(
      `Sidebar: expected ${expected.sidebar}, got ${actualBehavior.sidebar}`,
    )
  }

  if (actualBehavior.zoomControls !== expected.zoomControls) {
    errors.push(
      `Zoom: expected ${expected.zoomControls}, got ${actualBehavior.zoomControls}`,
    )
  }

  if (actualBehavior.statusFilters !== expected.statusFilters) {
    errors.push(
      `Filters: expected ${expected.statusFilters}, got ${actualBehavior.statusFilters}`,
    )
  }

  if (actualBehavior.searchWidth !== expected.searchWidth) {
    errors.push(
      `Search: expected ${expected.searchWidth}, got ${actualBehavior.searchWidth}`,
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Get current breakpoint name for a given width
 */
export function getCurrentBreakpointName(width: number): string {
  if (width < BREAKPOINTS.sm) return "xs"
  if (width < BREAKPOINTS.md) return "sm"
  if (width < BREAKPOINTS.lg) return "md"
  if (width < TRANSITION_BREAKPOINTS["lg-plus"]) return "lg"
  if (width < BREAKPOINTS.xl) return "lg-plus"
  if (width < BREAKPOINTS["2xl"]) return "xl"
  return "2xl"
}

/**
 * Log current responsive state for debugging
 */
export function logResponsiveState(width: number): void {
  const breakpoint = getCurrentBreakpointName(width)
  const testPoint = RESPONSIVE_TEST_POINTS.find(
    (tp) => Math.abs(tp.width - width) < 10,
  )

  console.group(`📐 Responsive State at ${width}px`)
  console.log(`Breakpoint: ${breakpoint}`)
  if (testPoint) {
    console.log(`Test Point: ${testPoint.label}`)
    console.log(`Description: ${testPoint.description}`)
    console.table(testPoint.expectedBehavior)
  }
  console.groupEnd()
}