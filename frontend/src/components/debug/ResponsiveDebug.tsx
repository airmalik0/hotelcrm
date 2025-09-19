/**
 * Debug component to visualize current breakpoint and responsive behavior
 * Only shows in development mode
 */

import { BREAKPOINTS, TRANSITION_BREAKPOINTS } from "@/constants/breakpoints"
import { useViewportWidth } from "@/hooks/useViewportWidth"
import { getCurrentBreakpointName } from "@/utils/breakpoint-test"
import { useEffect, useState } from "react"

export function ResponsiveDebug() {
  const width = useViewportWidth()
  const [isVisible, setIsVisible] = useState(false)
  const breakpoint = getCurrentBreakpointName(width)

  // Toggle with keyboard shortcut Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        setIsVisible((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Only show in development
  if (import.meta.env.PROD || !isVisible) {
    return null
  }

  // Determine critical zones
  const isInCriticalZone = width >= 1200 && width < 1280
  const isAtBreakpoint =
    width === BREAKPOINTS.sm ||
    width === BREAKPOINTS.md ||
    width === BREAKPOINTS.lg ||
    width === TRANSITION_BREAKPOINTS["lg-plus"] ||
    width === BREAKPOINTS.xl ||
    width === BREAKPOINTS["2xl"]

  // Determine expected behaviors
  const behaviors = {
    sidebar: width >= 1200 ? "static" : "hidden",
    grid: width >= 768 ? "desktop" : "mobile",
    zoomControls: width >= 1200 ? "visible" : "hidden",
    statusFilters: width >= 1200 ? "inline" : "dropdown",
    searchWidth: width >= 1280 ? "xl:w-80" : "md:w-48",
    roomColumns:
      width >= 1280 ? 4 : width >= 1024 ? 3 : width >= 640 ? 2 : 1,
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-white dark:bg-dark-2 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
          Responsive Debug
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          ✕
        </button>
      </div>

      {/* Current viewport */}
      <div className="mb-3">
        <div
          className={`text-2xl font-bold ${
            isInCriticalZone
              ? "text-yellow-600 dark:text-yellow-400"
              : isAtBreakpoint
              ? "text-red-600 dark:text-red-400"
              : "text-neutral-900 dark:text-white"
          }`}
        >
          {width}px
        </div>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          Breakpoint:{" "}
          <span className="font-semibold text-primary-600 dark:text-primary-400">
            {breakpoint}
          </span>
        </div>
      </div>

      {/* Critical zone warning */}
      {isInCriticalZone && (
        <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-600/25 rounded border border-yellow-300 dark:border-yellow-600/50">
          <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
            ⚠️ Critical Zone (1200-1280px)
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
            lg-plus → xl transition
          </div>
        </div>
      )}

      {/* Expected behaviors */}
      <div className="space-y-2 text-xs">
        <div className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Expected Behaviors:
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="text-neutral-600 dark:text-neutral-400">Sidebar:</div>
          <div
            className={`font-medium ${
              behaviors.sidebar === "static"
                ? "text-green-600 dark:text-green-400"
                : "text-neutral-500 dark:text-neutral-500"
            }`}
          >
            {behaviors.sidebar}
          </div>

          <div className="text-neutral-600 dark:text-neutral-400">Grid:</div>
          <div
            className={`font-medium ${
              behaviors.grid === "desktop"
                ? "text-blue-600 dark:text-blue-400"
                : "text-purple-600 dark:text-purple-400"
            }`}
          >
            {behaviors.grid}
          </div>

          <div className="text-neutral-600 dark:text-neutral-400">Zoom:</div>
          <div
            className={`font-medium ${
              behaviors.zoomControls === "visible"
                ? "text-green-600 dark:text-green-400"
                : "text-neutral-500 dark:text-neutral-500"
            }`}
          >
            {behaviors.zoomControls}
          </div>

          <div className="text-neutral-600 dark:text-neutral-400">Filters:</div>
          <div
            className={`font-medium ${
              behaviors.statusFilters === "inline"
                ? "text-green-600 dark:text-green-400"
                : "text-neutral-500 dark:text-neutral-500"
            }`}
          >
            {behaviors.statusFilters}
          </div>

          <div className="text-neutral-600 dark:text-neutral-400">Search:</div>
          <div className="font-medium text-neutral-700 dark:text-neutral-300">
            {behaviors.searchWidth}
          </div>

          <div className="text-neutral-600 dark:text-neutral-400">
            Room cols:
          </div>
          <div className="font-medium text-neutral-700 dark:text-neutral-300">
            {behaviors.roomColumns}
          </div>
        </div>
      </div>

      {/* Breakpoint reference */}
      <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
        <div className="text-xs space-y-1">
          <div className="text-neutral-500 dark:text-neutral-400">
            sm: {BREAKPOINTS.sm}px | md: {BREAKPOINTS.md}px
          </div>
          <div className="text-neutral-500 dark:text-neutral-400">
            lg: {BREAKPOINTS.lg}px |{" "}
            <span className="text-yellow-600 dark:text-yellow-400">
              lg+: {TRANSITION_BREAKPOINTS["lg-plus"]}px
            </span>
          </div>
          <div className="text-neutral-500 dark:text-neutral-400">
            xl: {BREAKPOINTS.xl}px | 2xl: {BREAKPOINTS["2xl"]}px
          </div>
        </div>
      </div>

      <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
        Press Ctrl+Shift+D to toggle
      </div>
    </div>
  )
}

/**
 * Visual breakpoint indicator bar
 */
export function ResponsiveIndicator() {
  const width = useViewportWidth()
  const [isVisible, setIsVisible] = useState(false)

  // Toggle with Ctrl+Shift+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "B") {
        setIsVisible((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (import.meta.env.PROD || !isVisible) {
    return null
  }

  const breakpoints = [
    { name: "sm", value: BREAKPOINTS.sm, color: "bg-blue-500" },
    { name: "md", value: BREAKPOINTS.md, color: "bg-green-500" },
    { name: "lg", value: BREAKPOINTS.lg, color: "bg-purple-500" },
    {
      name: "lg+",
      value: TRANSITION_BREAKPOINTS["lg-plus"],
      color: "bg-yellow-500",
    },
    { name: "xl", value: BREAKPOINTS.xl, color: "bg-red-500" },
    { name: "2xl", value: BREAKPOINTS["2xl"], color: "bg-indigo-500" },
  ]

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[9999] flex">
      {breakpoints.map((bp, index) => {
        const prevValue = index > 0 ? breakpoints[index - 1].value : 0
        const segmentWidth = bp.value - prevValue
        const maxWidth = 2000 // Assume max viewport for visualization
        const widthPercent = (segmentWidth / maxWidth) * 100

        return (
          <div
            key={bp.name}
            className={`${bp.color} ${
              width >= prevValue && width < bp.value ? "opacity-100" : "opacity-30"
            } transition-opacity`}
            style={{ width: `${widthPercent}%` }}
            title={`${bp.name}: ${prevValue}-${bp.value}px`}
          />
        )
      })}
      {/* Current position indicator */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${(width / 2000) * 100}%` }}
      />
    </div>
  )
}