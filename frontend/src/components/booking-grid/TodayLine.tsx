import { useEffect, useState } from "react"
import { getCurrentTimePosition } from "@/utils/date-helpers"
import clsx from "clsx"

interface TodayLineProps {
  viewStart: Date
  viewEnd: Date
}

export function TodayLine({ viewStart, viewEnd }: TodayLineProps) {
  const [position, setPosition] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Update position immediately
    const updatePosition = () => {
      const pos = getCurrentTimePosition(viewStart, viewEnd)

      // Only update state if position actually changed (prevents unnecessary re-renders)
      setPosition((prevPos) => {
        if (prevPos === pos) return prevPos
        return pos
      })

      // Only update time if we have a position
      if (pos) {
        setCurrentTime(new Date())
      }
    }

    updatePosition()

    // Only set interval if today is visible in current view
    const now = new Date()
    const isVisible = now >= viewStart && now <= viewEnd

    if (!isVisible) {
      // Today is not visible, no need for updates
      return
    }

    // Update every minute only when visible
    const interval = setInterval(updatePosition, 60000)

    return () => clearInterval(interval)
  }, [viewStart, viewEnd])

  if (!position) return null

  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
      style={{ left: position }}
    >
      {/* Vertical line */}
      <div className="absolute top-0 bottom-0 w-full bg-primary-500 dark:bg-primary-400" />

      {/* Time label */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <div className="bg-primary-500 dark:bg-primary-400 text-white text-xs px-2 py-0.5 rounded-full">
          {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Pulse indicator at the top */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2">
        <div className="relative">
          <div className="w-3 h-3 bg-primary-500 dark:bg-primary-400 rounded-full" />
          <div className="absolute inset-0 w-3 h-3 bg-primary-500 dark:bg-primary-400 rounded-full animate-ping" />
        </div>
      </div>
    </div>
  )
}