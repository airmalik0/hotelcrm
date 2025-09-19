/**
 * Centralized zoom constants for the booking grid
 * Dynamic zoom system where 100% = entire grid fits viewport
 */

// Zoom limits - now dynamic based on view
export const MIN_ZOOM = 1.0 // Minimum zoom (100% = entire grid fits)
export const DEFAULT_ZOOM = 1.0 // Default zoom level (100%)
export const ZOOM_STEP = 0.1 // Step size for zoom in/out

// View configurations
export const VIEW_DAYS = {
  week: 7, // Week view shows 7 days
  month: 30, // Month view approximation (actual: 28-31)
} as const

// Zoom presets - updated for new logic
export interface ZoomPreset {
  name: string
  scale: number
  description: string
}

export const ZOOM_PRESETS: ZoomPreset[] = [
  { name: "Fit All", scale: 1.0, description: "Entire grid visible" },
  { name: "Half View", scale: 2.0, description: "Half of grid visible" },
  { name: "Quarter View", scale: 4.0, description: "Quarter of grid visible" },
  { name: "Single Day", scale: 7.0, description: "Focus on one day" },
]

// Helper function to get maximum zoom based on view mode
// Max zoom = when 1 day fills the viewport
export function getMaxZoomForView(
  viewMode: "week" | "month",
  actualDays?: number,
): number {
  // For week: max zoom is 7x (7 days -> 1 day)
  // For month: max zoom is actual days count (28-31 days -> 1 day)
  if (viewMode === "week") {
    return VIEW_DAYS.week
  }
  // Use actual days if provided, otherwise use default
  return actualDays || VIEW_DAYS.month
}

// Helper function to get minimum zoom (always 1.0)
export function getMinZoomForView(): number {
  return MIN_ZOOM
}

// Helper to check if zoom level is valid for a given view
export function isZoomValid(
  zoomLevel: number,
  viewMode: "week" | "month",
  actualDays?: number,
): boolean {
  const maxZoom = getMaxZoomForView(viewMode, actualDays)
  return zoomLevel >= MIN_ZOOM && zoomLevel <= maxZoom
}

// Helper to clamp zoom level to valid range
export function clampZoom(
  zoomLevel: number,
  viewMode: "week" | "month",
  actualDays?: number,
): number {
  const maxZoom = getMaxZoomForView(viewMode, actualDays)
  return Math.min(maxZoom, Math.max(MIN_ZOOM, zoomLevel))
}
