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
    const totalHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    if (viewMode === "week") {
      // For week view: show clean day markers
      for (let day = 0; day <= 7; day++) {
        const hour = day * 24
        if (hour <= totalHours) {
          const markerDate = new Date(start.getTime() + hour * 60 * 60 * 1000)
          const position = (hour / totalHours) * 100

          // Clean format: "Mon, Sep 8"
          const weekday = markerDate.toLocaleDateString("en-US", {
            weekday: "short",
          })
          const month = markerDate.toLocaleDateString("en-US", {
            month: "short",
          })
          const dayNum = markerDate.getDate()
          const label = `${weekday}, ${month} ${dayNum}`

          markers.push({ position, label, isMain: true })
        }

        // Add subtle 6-hour markers without labels
        for (let subHour = 6; subHour < 24; subHour += 6) {
          const totalHour = day * 24 + subHour
          if (totalHour <= totalHours) {
            const subPosition = (totalHour / totalHours) * 100
            markers.push({ position: subPosition, label: "", isMain: false })
          }
        }
      }
    } else {
      // For month view: show just day numbers
      const totalDays = Math.ceil(totalHours / 24)
      for (let day = 0; day <= totalDays; day++) {
        const markerDate = new Date(start.getTime() + day * 24 * 60 * 60 * 1000)
        const hour = day * 24
        const position = (hour / totalHours) * 100

        if (position <= 100) {
          // Simple format: just day number for most days
          const dayNum = markerDate.getDate()
          const isFirstOfMonth = dayNum === 1
          const isSunday = markerDate.getDay() === 0

          // Show "Sep 1" for first of month, otherwise just number
          const label = isFirstOfMonth
            ? markerDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : dayNum.toString()

          // Mark Sundays and 1st of month as main
          const isMain = isSunday || isFirstOfMonth

          markers.push({ position, label, isMain })
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
        {timeMarkers.map((marker, index) => (
          <div
            key={`marker-${index}`}
            className="absolute top-0 h-full flex items-center"
            style={{ left: `${marker.position}%` }}
          >
            {/* Vertical line extending into grid */}
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

            {/* Time label */}
            {marker.label && (
              <div
                className={`
                  absolute whitespace-nowrap px-1
                  ${
                    marker.isMain
                      ? "text-xs font-medium text-neutral-700 dark:text-neutral-300"
                      : "text-xs text-neutral-500 dark:text-neutral-400"
                  }
                  ${marker.position < 5 ? "left-0" : ""}
                  ${marker.position > 95 ? "right-0" : ""}
                  ${marker.position >= 5 && marker.position <= 95 ? "-translate-x-1/2" : ""}
                `}
              >
                {marker.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current time indicator */}
      {(() => {
        const now = new Date()
        if (now >= viewStart && now <= viewEnd) {
          const totalHours =
            (viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60)
          const currentOffset =
            (now.getTime() - viewStart.getTime()) / (1000 * 60 * 60)
          const position = (currentOffset / totalHours) * 100

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
