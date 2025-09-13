import type { CalendarViewMode } from "@/types/booking"
import {
  getMonthEnd,
  getMonthStart,
  getWeekEnd,
  getWeekStart,
} from "@/types/booking"
import type React from "react"
import { useMemo } from "react"

interface TimeScaleProps {
  viewMode: CalendarViewMode
  currentDate: Date
}

// Constants for better maintainability
const HOURS_PER_DAY = 24
const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_DAY = HOURS_PER_DAY * MS_PER_HOUR
const LABEL_CENTER_OFFSET_HOURS = 12 // Center labels at noon
const SUBTLE_MARKER_INTERVAL_HOURS = 6

export function TimeScale({ viewMode, currentDate }: TimeScaleProps) {
  const { viewStart, viewEnd, timeMarkers } = useMemo(() => {
    const start =
      viewMode === "week"
        ? getWeekStart(currentDate)
        : getMonthStart(currentDate)

    const end =
      viewMode === "week" ? getWeekEnd(currentDate) : getMonthEnd(currentDate)

    // Generate time markers based on view mode
    const markers: Array<{ position: number; label: string; isMain: boolean }> =
      []
    const totalDuration = end.getTime() - start.getTime()

    if (viewMode === "week") {
      // For week view: show all day boundaries and labels
      for (let day = 0; day <= 7; day++) {
        // Use milliseconds for accurate date calculation
        const dayStart = new Date(start.getTime() + day * MS_PER_DAY)
        dayStart.setHours(0, 0, 0, 0)

        // Position of day boundary (start of day)
        const boundaryPosition = ((dayStart.getTime() - start.getTime()) / totalDuration) * 100

        // Add boundary line for all day boundaries
        if (boundaryPosition <= 100) {
          markers.push({
            position: boundaryPosition,
            label: "",
            isMain: true
          })
        }

        // Add label at center of day (but not for the last boundary)
        if (day < 7) {
          const labelPosition = ((dayStart.getTime() + LABEL_CENTER_OFFSET_HOURS * MS_PER_HOUR - start.getTime()) / totalDuration) * 100

          // Add label at center of day
          const weekday = dayStart.toLocaleDateString("en-US", {
            weekday: "short",
          })
          const month = dayStart.toLocaleDateString("en-US", {
            month: "short",
          })
          const dayNum = dayStart.getDate()

          markers.push({
            position: labelPosition,
            label: `${weekday}, ${month} ${dayNum}`,
            isMain: false  // Labels don't have lines
          })
        }

        // Add subtle markers at regular intervals within this day
        if (day < 7) {
          for (let hour = SUBTLE_MARKER_INTERVAL_HOURS; hour < HOURS_PER_DAY; hour += SUBTLE_MARKER_INTERVAL_HOURS) {
            const markerTime = new Date(dayStart)
            markerTime.setHours(hour)
            const markerPosition = ((markerTime.getTime() - start.getTime()) / totalDuration) * 100

            if (markerPosition > 0 && markerPosition < 100) {
              markers.push({
                position: markerPosition,
                label: "",
                isMain: false
              })
            }
          }
        }
      }
    } else {
      // For month view: show day boundaries and centered labels
      const totalDays = Math.ceil(totalDuration / MS_PER_DAY)

      for (let day = 0; day <= totalDays; day++) {
        // Use milliseconds for accurate date calculation
        const dayStart = new Date(start.getTime() + day * MS_PER_DAY)
        dayStart.setHours(0, 0, 0, 0)

        // Position of day boundary
        const boundaryPosition = ((dayStart.getTime() - start.getTime()) / totalDuration) * 100

        if (boundaryPosition <= 100) {
          const dayNum = dayStart.getDate()
          const isFirstOfMonth = dayNum === 1
          const isSunday = dayStart.getDay() === 0

          // Add boundary line for every day
          markers.push({
            position: boundaryPosition,
            label: "",
            isMain: isSunday || isFirstOfMonth  // Sundays and 1st of month get thicker lines
          })

          // Add label at center of day cell
          if (day < totalDays) {  // Don't add label for last boundary
            const labelPosition = ((dayStart.getTime() + LABEL_CENTER_OFFSET_HOURS * MS_PER_HOUR - start.getTime()) / totalDuration) * 100

            if (labelPosition <= 100) {
              // Just show day number, no month prefix
              const label = dayNum.toString()

              markers.push({
                position: labelPosition,
                label,
                isMain: false  // Labels don't have lines
              })
            }
          }
        }
      }
    }

    return {
      viewStart: start,
      viewEnd: end,
      timeMarkers: markers,
    }
  }, [viewMode, currentDate])

  return (
    <div className="relative h-10 w-full bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600">
      {/* Timeline scale */}
      <div className="relative h-full">
        {/* Time markers */}
        {timeMarkers.map((marker, index) => {
          // Render lines only for markers without labels, or main markers with empty labels
          const shouldRenderLine = marker.label === "" || (marker.isMain && marker.label === "")

          return (
            <div
              key={`marker-${index}`}
              className="absolute top-0 h-full flex items-center"
              style={{ left: `${marker.position}%` }}
            >
              {/* Vertical line extending into grid - only for boundary markers */}
              {shouldRenderLine && (
                <div
                  className={`
                    absolute top-full w-px h-screen pointer-events-none
                    ${
                      marker.isMain
                        ? "bg-neutral-300 dark:bg-neutral-600"
                        : "bg-neutral-200 dark:bg-neutral-700"
                    }
                  `}
                />
              )}

              {/* Time label - only for markers with labels */}
              {marker.label && (
                <div
                  className={`
                    absolute whitespace-nowrap px-1 text-xs font-medium text-neutral-700 dark:text-neutral-300
                    ${marker.position < 5 ? "left-0" : ""}
                    ${marker.position > 95 ? "right-0" : ""}
                    ${marker.position >= 5 && marker.position <= 95 ? "-translate-x-1/2" : ""}
                  `}
                >
                  {marker.label}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current time indicator */}
      {(() => {
        const now = new Date()
        if (now >= viewStart && now <= viewEnd) {
          const totalDuration = viewEnd.getTime() - viewStart.getTime()
          const currentOffset = now.getTime() - viewStart.getTime()
          const position = (currentOffset / totalDuration) * 100

          return (
            <div
              className="absolute top-0 h-full pointer-events-none z-40"
              style={{ left: `${position}%` }}
            >
              <div className="relative h-full flex items-center">
                {/* Red line extending down */}
                <div className="absolute top-full w-0.5 h-screen bg-red-500 dark:bg-red-400" />

                {/* Current time dot */}
                <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full" />
              </div>
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}
