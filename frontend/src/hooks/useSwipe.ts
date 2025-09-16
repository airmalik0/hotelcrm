import { useRef, useEffect } from "react"

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
}

export function useSwipe<T extends HTMLElement = HTMLDivElement>(
  handlers: SwipeHandlers
) {
  const ref = useRef<T>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const threshold = handlers.threshold || 50

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      }

      const diffX = touchStart.current.x - touchEnd.x
      const diffY = touchStart.current.y - touchEnd.y

      // Determine if it's a horizontal or vertical swipe
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (Math.abs(diffX) > threshold) {
          if (diffX > 0) {
            handlers.onSwipeLeft?.()
          } else {
            handlers.onSwipeRight?.()
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(diffY) > threshold) {
          if (diffY > 0) {
            handlers.onSwipeUp?.()
          } else {
            handlers.onSwipeDown?.()
          }
        }
      }

      touchStart.current = null
    }

    element.addEventListener("touchstart", handleTouchStart, { passive: true })
    element.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handlers.onSwipeLeft, handlers.onSwipeRight, handlers.onSwipeUp, handlers.onSwipeDown, threshold])

  return ref
}