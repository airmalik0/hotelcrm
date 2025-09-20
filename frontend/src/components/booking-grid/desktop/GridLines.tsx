import { generateTimeScale } from "@/utils/date-helpers"
import type { ViewMode } from "@/utils/date-helpers"
import clsx from "clsx"
import { memo } from "react"

interface GridLinesProps {
  viewStart: Date
  viewEnd: Date
  viewMode: ViewMode
}

export const GridLines = memo(function GridLines({
  viewStart,
  viewEnd,
  viewMode,
}: GridLinesProps) {
  const markers = generateTimeScale(viewStart, viewEnd, viewMode)

  return (
    <div className="absolute inset-0 pointer-events-none">
      {markers.map((marker) => (
        <div
          key={marker.date.getTime()}
          className={clsx(
            "absolute top-0 bottom-0 w-px",
            marker.isToday
              ? "bg-primary-500/50 dark:bg-primary-400/50 z-10"
              : "bg-neutral-200 dark:bg-neutral-700",
          )}
          style={{ left: marker.position }}
        />
      ))}
    </div>
  )
})
