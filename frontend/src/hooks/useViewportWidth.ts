import { useEffect, useState } from "react"

/**
 * Hook to get reactive viewport width that updates on resize
 * Handles SSR safely by returning default value during server rendering
 */
export function useViewportWidth(defaultWidth = 1920) {
  const [width, setWidth] = useState(() => {
    // Safe for SSR - return default during server rendering
    if (typeof window === "undefined") {
      return defaultWidth
    }
    return window.innerWidth
  })

  useEffect(() => {
    // Skip if SSR
    if (typeof window === "undefined") {
      return
    }

    const handleResize = () => {
      setWidth(window.innerWidth)
    }

    // Set initial value
    handleResize()

    // Add resize listener with debounce
    let timeoutId: number
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(handleResize, 150)
    }

    window.addEventListener("resize", debouncedResize)
    return () => {
      window.removeEventListener("resize", debouncedResize)
      clearTimeout(timeoutId)
    }
  }, [])

  return width
}
