import { useGridZoom } from "@/contexts/GridZoomContext"
import type { ViewMode } from "@/utils/date-helpers"
import { useMemo } from "react"

// Constants for layout calculations
const ROOM_COLUMN_WIDTH = 200

/**
 * Hook to get grid dimensions from context
 * Now that dayWidth is calculated in GridZoomContext, this is a simple wrapper
 */
export function useGridDimensions(viewMode: ViewMode) {
  const { dayWidth, actualDaysInView, roomHeight, fontSize, padding } =
    useGridZoom()

  // Calculate total timeline width
  const timelineWidth = useMemo(() => {
    return dayWidth * actualDaysInView
  }, [dayWidth, actualDaysInView])

  // Calculate visible days at current zoom
  const visibleDays = useMemo(() => {
    // This represents how many days are visible in the viewport
    // When zoom = 1.0, all days are visible
    // When zoom = 2.0, half the days are visible, etc.
    return actualDaysInView / (dayWidth / (dayWidth / actualDaysInView))
  }, [actualDaysInView, dayWidth])

  return {
    dayWidth,
    timelineWidth,
    roomHeight,
    fontSize,
    padding,
    visibleDays,
    roomColumnWidth: ROOM_COLUMN_WIDTH,
  }
}
