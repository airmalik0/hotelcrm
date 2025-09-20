import { generateTimeScale } from "@/utils/date-helpers"
import type { ViewMode } from "@/utils/date-helpers"
import clsx from "clsx"
import { memo } from "react"

interface TimelineGridProps {
  viewStart: Date
  viewEnd: Date
  viewMode: ViewMode
}

export const TimelineGrid = memo(function TimelineGrid({
  viewStart,
  viewEnd,
  viewMode,
}: TimelineGridProps) {
  const markers = generateTimeScale(viewStart, viewEnd, viewMode)

  return (
    <>
      {markers.map((marker) => (
        <div
          key={marker.date.getTime()}
          className={clsx(
            "absolute top-0 bottom-0 w-px pointer-events-none",
            marker.isToday
              ? "bg-primary-500 dark:bg-primary-400 z-10"
              : "bg-neutral-200 dark:bg-neutral-700",
          )}
          style={{ left: marker.position }}
        />
      ))}
    </>
  )
})
