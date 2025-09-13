import type { CalendarViewMode } from "@/types/booking"
import { getMonthEnd, getMonthStart, getWeekEnd, getWeekStart } from "@/types/booking"
import { generateTimeScale } from "@/utils/calendar"
import type React from "react"
import { useMemo } from "react"

interface TimeScaleProps {
  viewMode: CalendarViewMode
  currentDate: Date
}

export function TimeScale({ viewMode, currentDate }: TimeScaleProps) {
  const { viewStart, markers } = useMemo(() => {
    const start = viewMode === "week"
      ? getWeekStart(currentDate)
      : getMonthStart(currentDate)

    return {
      viewStart: start,
      markers: generateTimeScale(viewMode, start)
    }
  }, [viewMode, currentDate])

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Timeline container */}
      <div className="absolute inset-0 flex items-center">
        {/* Markers */}
        {markers.map((marker, index) => (
          <div
            key={`${marker.date.toISOString()}-${index}`}
            className="absolute flex flex-col items-center"
            style={{ left: `${marker.position}%` }}
          >
            {/* Tick mark */}
            <div className="w-px h-3 bg-neutral-300 dark:bg-neutral-600" />

            {/* Label */}
            <div className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap transform -translate-x-1/2">
              {marker.label}
            </div>
          </div>
        ))}
      </div>

      {/* Current time indicator (optional) */}
      {(() => {
        const now = new Date()
        const viewEnd = viewMode === "week"
          ? getWeekEnd(currentDate)
          : getMonthEnd(currentDate)

        // Check if current time is within view
        if (now >= viewStart && now <= viewEnd) {
          const totalHours = (viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60)
          const currentOffset = (now.getTime() - viewStart.getTime()) / (1000 * 60 * 60)
          const position = (currentOffset / totalHours) * 100

          return (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 dark:bg-red-400 z-10"
              style={{ left: `${position}%` }}
              title={`Current time: ${now.toLocaleTimeString()}`}
            >
              {/* Current time dot */}
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full" />
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}