import { generateTimeScale } from "@/utils/date-helpers"
import type { ViewMode } from "@/utils/date-helpers"
import clsx from "clsx"
import { memo, useEffect, useRef, useState } from "react"

interface TimeScaleProps {
  viewStart: Date
  viewEnd: Date
  viewMode: ViewMode
}

export const TimeScale = memo(function TimeScale({
  viewStart,
  viewEnd,
  viewMode,
}: TimeScaleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>()

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    resizeObserver.observe(containerRef.current)
    setContainerWidth(containerRef.current.offsetWidth)

    return () => resizeObserver.disconnect()
  }, [])

  const markers = generateTimeScale(
    viewStart,
    viewEnd,
    viewMode,
    containerWidth,
  )

  return (
    <div ref={containerRef} className="relative h-10 bg-white dark:bg-dark-2">
      {/* Time markers */}
      {markers.map((marker, index) => (
        <div
          key={index}
          className="absolute top-0 h-full flex items-center"
          style={{ left: marker.position }}
        >
          {/* Time label */}
          <div
            className={clsx(
              "px-2 text-xs font-medium whitespace-nowrap",
              marker.isToday
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-600 dark:text-neutral-400",
            )}
          >
            {marker.label}
          </div>
        </div>
      ))}
    </div>
  )
})
