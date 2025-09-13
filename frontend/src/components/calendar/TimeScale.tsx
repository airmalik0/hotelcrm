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
      // For week view: show only day markers
      for (let day = 0; day <= 7; day++) {
        const hour = day * 24
        if (hour <= totalHours) {
          const markerDate = new Date(start.getTime() + hour * 60 * 60 * 1000)
          const position = (hour / totalHours) * 100

          const label = markerDate.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })

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
      // For month view: show every day
      const totalDays = Math.ceil(totalHours / 24)
      for (let day = 0; day <= totalDays; day++) {
        const markerDate = new Date(start.getTime() + day * 24 * 60 * 60 * 1000)
        const hour = day * 24
        const position = (hour / totalHours) * 100

        if (position <= 100) {
          const label = markerDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })

          // Mark Sundays and 1st of month as main
          const isMain = markerDate.getDay() === 0 || markerDate.getDate() === 1

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
    <div className="relative h-full w-full bg-neutral-50 dark:bg-dark-3 border-b border-neutral-200 dark:border-neutral-600">
      {/* Timeline scale */}
      <div className="relative h-full">
        {/* Time markers */}
        {timeMarkers.map((marker, index) => (
          <div
            key={`marker-${index}`}
            className="absolute top-0 h-full"
            style={{ left: `${marker.position}%` }}
          >
            {/* Vertical line extending into grid */}
            <div
              className={`
                absolute top-0 w-px h-full
                ${
                  marker.isMain
                    ? "bg-neutral-300 dark:bg-neutral-600"
                    : "bg-neutral-200 dark:bg-neutral-700"
                }
              `}
            />

            {/* Time label */}
            <div
              className={`
                absolute top-1/2 -translate-y-1/2 whitespace-nowrap
                ${
                  marker.isMain
                    ? "text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                    : "text-xs text-neutral-500 dark:text-neutral-400"
                }
                ${marker.position < 5 ? "left-1" : ""}
                ${marker.position > 95 ? "right-1" : ""}
                ${marker.position >= 5 && marker.position <= 95 ? "-translate-x-1/2" : ""}
              `}
            >
              {marker.label}
            </div>
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
              className="absolute top-0 h-full pointer-events-none z-20"
              style={{ left: `${position}%` }}
            >
              <div className="relative h-full">
                {/* Red line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 dark:bg-red-400" />

                {/* Current time label */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-500 dark:bg-red-400 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                  {now.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}
