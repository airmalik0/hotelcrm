import { useGridZoom } from "@/contexts/GridZoomContext"
import { useEffect, useRef } from "react"

interface UseGridZoomControlsOptions {
  enabled?: boolean
  preventBrowserZoom?: boolean
  viewMode?: "week" | "month"
}

export function useGridZoomControls({
  enabled = true,
  preventBrowserZoom = true,
  viewMode = "week",
}: UseGridZoomControlsOptions = {}) {
  const {
    zoomIn,
    zoomOut,
    resetZoom,
    setZoomLevel,
    zoomLevel,
    getMinZoom,
    getMaxZoom,
  } = useGridZoom()
  const containerRef = useRef<HTMLDivElement>(null)
  const lastTouchDistance = useRef<number | null>(null)
  const lastCursorPosition = useRef<{ x: number; y: number } | null>(null)
  const lastPinchCenter = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Common zoom function that keeps a focal point in place
    function applyZoomAroundPoint(
      newZoomLevel: number,
      focalPoint: { x: number; y: number },
      container: HTMLElement,
      currentZoom: number = zoomLevel,
    ) {
      // Get current scroll position
      const scrollLeft = container.scrollLeft
      const scrollTop = container.scrollTop

      // Calculate focal point relative to content (not viewport)
      const contentX = scrollLeft + focalPoint.x
      const contentY = scrollTop + focalPoint.y

      // Calculate zoom ratio
      const zoomRatio = newZoomLevel / currentZoom

      // Calculate new content position after zoom
      const newContentX = contentX * zoomRatio
      const newContentY = contentY * zoomRatio

      // Calculate new scroll position to keep focal point in same viewport position
      const newScrollLeft = newContentX - focalPoint.x
      const newScrollTop = newContentY - focalPoint.y

      // Apply zoom level
      setZoomLevel(newZoomLevel)

      // Apply scroll adjustment after DOM updates
      requestAnimationFrame(() => {
        container.scrollTo({
          left: Math.max(0, newScrollLeft),
          top: Math.max(0, newScrollTop),
          behavior: "auto",
        })
      })
    }

    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd key
      if (!(e.ctrlKey || e.metaKey)) return

      switch (e.key) {
        case "+":
        case "=": // Handle both + and = (same key without shift)
          e.preventDefault()
          zoomIn(viewMode)
          break
        case "-":
          e.preventDefault()
          zoomOut(viewMode)
          break
        case "0":
          e.preventDefault()
          resetZoom()
          break
      }
    }

    // Track mouse position for zoom-to-cursor
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        const rect = containerRef.current.getBoundingClientRect()
        lastCursorPosition.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }
      }
    }

    // Handle mouse wheel with Ctrl/Cmd
    const handleWheel = (e: WheelEvent) => {
      // Only handle if Ctrl/Cmd is pressed
      if (!(e.ctrlKey || e.metaKey)) return

      // Check if the wheel event is from the grid container
      const container = containerRef.current
      if (!container || !container.contains(e.target as Node)) {
        return
      }

      if (preventBrowserZoom) {
        e.preventDefault()
      }

      // Get cursor position relative to container
      const rect = container.getBoundingClientRect()
      const focalPoint = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      // Calculate new zoom level with dynamic limits
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newLevel = zoomLevel + delta
      const minZoom = getMinZoom()
      const maxZoom = getMaxZoom()

      if (newLevel >= minZoom && newLevel <= maxZoom) {
        applyZoomAroundPoint(newLevel, focalPoint, container, zoomLevel)
      }
    }

    // Handle touch gestures (pinch to zoom)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const distance = getTouchDistance(e.touches)
        lastTouchDistance.current = distance

        // Calculate and store initial center between fingers
        const container = containerRef.current
        if (container) {
          const rect = container.getBoundingClientRect()
          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
          lastPinchCenter.current = {
            x: centerX - rect.left,
            y: centerY - rect.top,
          }
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        const container = containerRef.current
        if (!container) return

        const distance = getTouchDistance(e.touches)
        const scale = distance / lastTouchDistance.current

        // Calculate current center between fingers
        const rect = container.getBoundingClientRect()
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const currentCenter = {
          x: centerX - rect.left,
          y: centerY - rect.top,
        }

        // Apply scaling with sensitivity adjustment
        const delta = (scale - 1) * 0.5
        const newLevel = zoomLevel + delta
        const minZoom = getMinZoom()
        const maxZoom = getMaxZoom()

        if (newLevel >= minZoom && newLevel <= maxZoom) {
          // Use the center point between fingers as focal point
          applyZoomAroundPoint(newLevel, currentCenter, container, zoomLevel)
        }

        lastTouchDistance.current = distance
        lastPinchCenter.current = currentCenter

        if (preventBrowserZoom) {
          e.preventDefault()
        }
      }
    }

    const handleTouchEnd = () => {
      lastTouchDistance.current = null
      lastPinchCenter.current = null
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
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("touchstart", handleTouchStart)
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("wheel", handleWheel)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [
    enabled,
    preventBrowserZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoomLevel,
    zoomLevel,
    viewMode,
    getMinZoom,
    getMaxZoom,
  ])

  return containerRef
}
