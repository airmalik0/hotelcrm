import { useEffect, useRef } from "react"
import { useGridZoom } from "@/contexts/GridZoomContext"

interface UseGridZoomControlsOptions {
  enabled?: boolean
  preventBrowserZoom?: boolean
}

export function useGridZoomControls({
  enabled = true,
  preventBrowserZoom = true,
}: UseGridZoomControlsOptions = {}) {
  const { zoomIn, zoomOut, resetZoom, setZoomLevel, zoomLevel } = useGridZoom()
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTouchDistance = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd key
      if (!(e.ctrlKey || e.metaKey)) return

      switch (e.key) {
        case "+":
        case "=": // Handle both + and = (same key without shift)
          e.preventDefault()
          zoomIn()
          break
        case "-":
          e.preventDefault()
          zoomOut()
          break
        case "0":
          e.preventDefault()
          resetZoom()
          break
      }
    }

    // Handle mouse wheel with Ctrl/Cmd
    const handleWheel = (e: WheelEvent) => {
      // Only handle if Ctrl/Cmd is pressed
      if (!(e.ctrlKey || e.metaKey)) return

      // Check if the wheel event is from the grid container
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        return
      }

      if (preventBrowserZoom) {
        e.preventDefault()
      }

      // Calculate new zoom level
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoomLevel(zoomLevel + delta)
    }

    // Handle touch gestures (pinch to zoom)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const distance = getTouchDistance(e.touches)
        lastTouchDistance.current = distance
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        const distance = getTouchDistance(e.touches)
        const scale = distance / lastTouchDistance.current

        // Apply scaling with sensitivity adjustment
        const delta = (scale - 1) * 0.5
        setZoomLevel(zoomLevel + delta)

        lastTouchDistance.current = distance

        if (preventBrowserZoom) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = () => {
      lastTouchDistance.current = null
    }

    // Helper function to calculate distance between two touches
    function getTouchDistance(touches: TouchList): number {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("wheel", handleWheel, { passive: false })
    document.addEventListener("touchstart", handleTouchStart)
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("wheel", handleWheel)
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [enabled, preventBrowserZoom, zoomIn, zoomOut, resetZoom, setZoomLevel, zoomLevel])

  return containerRef
}