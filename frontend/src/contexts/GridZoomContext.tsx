import {
  BREAKPOINTS,
  LARGE_SCREEN_LIMITS,
  GRID_STATES,
  type GridState
} from "@/constants/breakpoints"
import {
  DEFAULT_ZOOM,
  MIN_ZOOM,
  ZOOM_PRESETS,
  ZOOM_STEP,
  type ZoomPreset,
  clampZoom,
  getMaxZoomForView,
  getMinZoomForView,
} from "@/constants/zoom"
import { useViewportWidth } from "@/hooks/useViewportWidth"
import { differenceInDays } from "date-fns"
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

// Helper function to determine current grid state based on viewport width
function getGridState(viewportWidth: number): GridState {
  if (viewportWidth < GRID_STATES.tablet.min) return 'mobile'
  if (viewportWidth < GRID_STATES.desktop.min) return 'tablet'
  if (viewportWidth < GRID_STATES.large.min) return 'desktop'
  return 'large'
}

// Layout Constants (following best practices - no magic numbers)
const LAYOUT_CONSTANTS = {
  ROOM_COLUMN_WIDTH: 200, // Fixed width of room column in grid
  SIDEBAR_WIDTH_LG: 256, // w-64 in Tailwind = 256px
  SIDEBAR_WIDTH_2XL: 320, // w-80 in Tailwind = 320px (for large screens)
  MAIN_CONTAINER_PADDING: 48, // p-6 = 24px * 2 sides
  MIN_TIMELINE_WIDTH: 400, // Minimum usable width for timeline
} as const

interface GridZoomContextValue {
  // Current zoom level (1.0 - dynamic max)
  zoomLevel: number
  // Predefined zoom presets
  presets: ZoomPreset[]
  // Current preset (if matches)
  currentPreset: ZoomPreset | null
  // Current view mode
  currentViewMode: "week" | "month"
  // Current grid state based on viewport
  currentGridState: GridState
  // View dates for calculating actual days
  viewStart: Date | null
  viewEnd: Date | null
  actualDaysInView: number
  // Actions - viewMode passed as parameter when needed
  setZoomLevel: (level: number) => void
  zoomIn: (viewMode?: "week" | "month") => void
  zoomOut: (viewMode?: "week" | "month") => void
  resetZoom: () => void
  applyPreset: (preset: ZoomPreset) => void
  // View mode switching
  switchViewMode: (viewMode: "week" | "month") => void
  // View dates updating
  setViewDates: (start: Date, end: Date) => void
  // Zoom limits helper
  getMinZoom: () => number
  getMaxZoom: () => number
  // Computed values
  dayWidth: number
  roomHeight: number
  fontSize: number
  padding: number
  // Large screen optimizations
  isLargeScreen: boolean
  maxContentWidth: number
}

const GridZoomContext = createContext<GridZoomContextValue | null>(null)

interface GridZoomProviderProps {
  children: ReactNode
}

export function GridZoomProvider({ children }: GridZoomProviderProps) {
  // Get viewport width for responsive calculations
  const viewportWidth = useViewportWidth()

  // Calculate current grid state and large screen status
  const currentGridState = useMemo(() => getGridState(viewportWidth), [viewportWidth])
  const isLargeScreen = currentGridState === 'large'

  // Track view dates to calculate actual days
  const [viewStart, setViewStart] = useState<Date | null>(null)
  const [viewEnd, setViewEnd] = useState<Date | null>(null)

  // Track current view mode
  const [currentViewMode, setCurrentViewMode] = useState<"week" | "month">(
    "week",
  )

  // Calculate actual days in view
  const actualDaysInView = useMemo(() => {
    if (!viewStart || !viewEnd) {
      // Default fallback
      return currentViewMode === "week" ? 7 : 30
    }
    // Calculate actual difference in days (add 1 because dates are inclusive)
    return differenceInDays(viewEnd, viewStart) + 1
  }, [viewStart, viewEnd, currentViewMode])

  // Load saved zoom levels from localStorage
  const [weekZoom, setWeekZoom] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("booking-grid-zoom-week")
      return saved ? clampZoom(Number.parseFloat(saved), "week") : DEFAULT_ZOOM
    }
    return DEFAULT_ZOOM
  })

  const [monthZoom, setMonthZoom] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("booking-grid-zoom-month")
      return saved
        ? clampZoom(Number.parseFloat(saved), "month", actualDaysInView)
        : DEFAULT_ZOOM
    }
    return DEFAULT_ZOOM
  })

  // Current zoom level based on view mode
  const zoomLevel = currentViewMode === "week" ? weekZoom : monthZoom

  // Save zoom levels to localStorage when they change
  useEffect(() => {
    localStorage.setItem("booking-grid-zoom-week", weekZoom.toString())
  }, [weekZoom])

  useEffect(() => {
    localStorage.setItem("booking-grid-zoom-month", monthZoom.toString())
  }, [monthZoom])

  // Find current preset if zoom matches
  const currentPreset = useMemo(
    () =>
      ZOOM_PRESETS.find((p) => Math.abs(p.scale - zoomLevel) < 0.05) || null,
    [zoomLevel],
  )

  // Calculate available width for timeline (excluding room column)
  const availableWidth = useMemo(() => {
    // IMPORTANT: The grid is rendered inside a flex container structure:
    // <div flex> <aside w-64 xl:static> <div flex-1> <main p-6> [GRID HERE]
    //
    // On mobile (<1280px): Sidebar is fixed (out of flow), main gets full viewport
    // On desktop (>=1280px): Sidebar is static (in flow), main gets remaining space

    const hasSidebar = viewportWidth >= BREAKPOINTS.xl

    // Calculate the actual container width (not viewport width!)
    let containerWidth: number
    if (hasSidebar) {
      // Desktop: main content area = viewport - sidebar
      // Use appropriate sidebar width based on screen size
      const sidebarWidth = isLargeScreen
        ? LAYOUT_CONSTANTS.SIDEBAR_WIDTH_2XL
        : LAYOUT_CONSTANTS.SIDEBAR_WIDTH_LG
      containerWidth = viewportWidth - sidebarWidth
    } else {
      // Mobile/Tablet: main content gets full viewport width
      // Sidebar is position:fixed so doesn't affect layout
      containerWidth = viewportWidth
    }

    // Apply max-width constraint for large screens to prevent over-stretching
    if (isLargeScreen) {
      containerWidth = Math.min(containerWidth, LARGE_SCREEN_LIMITS.MAX_CONTENT_WIDTH)
    }

    // Now subtract padding from the container width
    // The grid has overflow-x-auto so horizontal scrollbar appears only when needed
    // and doesn't affect the layout calculation
    const gridAvailableWidth =
      containerWidth - LAYOUT_CONSTANTS.MAIN_CONTAINER_PADDING

    // Available width for timeline (grid minus fixed room column)
    let timelineAvailableWidth =
      gridAvailableWidth - LAYOUT_CONSTANTS.ROOM_COLUMN_WIDTH

    // Apply large screen constraints to prevent over-stretching
    if (isLargeScreen) {
      timelineAvailableWidth = Math.min(
        timelineAvailableWidth,
        LARGE_SCREEN_LIMITS.MAX_TIMELINE_WIDTH
      )
    }

    return Math.max(timelineAvailableWidth, LAYOUT_CONSTANTS.MIN_TIMELINE_WIDTH)
  }, [viewportWidth, isLargeScreen])

  // Computed dimensions based on zoom level
  const dayWidth = useMemo(() => {
    // At zoom 1.0, all days should fit exactly in available width
    // dayWidth = (availableWidth / actualDaysInView) * zoomLevel
    const baseDayWidth = availableWidth / actualDaysInView
    let calculatedDayWidth = baseDayWidth * zoomLevel

    // Apply maximum day width constraint for large screens to maintain readability
    if (isLargeScreen) {
      calculatedDayWidth = Math.min(calculatedDayWidth, LARGE_SCREEN_LIMITS.MAX_DAY_WIDTH)
    }

    // Don't round to maintain precision, especially at max zoom
    return calculatedDayWidth
  }, [availableWidth, actualDaysInView, zoomLevel, isLargeScreen])

  const roomHeight = useMemo(() => {
    // Base height at zoom 1.0 is 64px
    return Math.round(64 + (zoomLevel - 1) * 16)
  }, [zoomLevel])

  const fontSize = useMemo(() => {
    // Scale font size slightly with zoom
    if (zoomLevel < 0.7) return 10
    if (zoomLevel < 0.9) return 11
    if (zoomLevel > 1.5) return 14
    if (zoomLevel > 1.2) return 13
    return 12
  }, [zoomLevel])

  const padding = useMemo(() => {
    // Adjust padding based on zoom
    if (zoomLevel < 0.7) return 4
    if (zoomLevel > 1.5) return 12
    return 8
  }, [zoomLevel])

  // Calculate maximum content width for large screen centering
  const maxContentWidth = useMemo(() => {
    if (!isLargeScreen) return Infinity
    return LARGE_SCREEN_LIMITS.MAX_CONTENT_WIDTH
  }, [isLargeScreen])

  // Get dynamic min and max zoom
  const getMinZoom = useCallback(() => {
    return MIN_ZOOM
  }, [])

  const getMaxZoom = useCallback(() => {
    return getMaxZoomForView(currentViewMode, actualDaysInView)
  }, [currentViewMode, actualDaysInView])

  // Actions
  const setZoomLevel = useCallback(
    (level: number) => {
      const clampedLevel = clampZoom(level, currentViewMode, actualDaysInView)
      if (currentViewMode === "week") {
        setWeekZoom(clampedLevel)
      } else {
        setMonthZoom(clampedLevel)
      }
    },
    [currentViewMode, actualDaysInView],
  )

  const switchViewMode = useCallback((viewMode: "week" | "month") => {
    setCurrentViewMode(viewMode)
  }, [])

  const setViewDates = useCallback((start: Date, end: Date) => {
    setViewStart(start)
    setViewEnd(end)
  }, [])

  const zoomIn = useCallback(
    (viewMode?: "week" | "month") => {
      const maxZoom = getMaxZoomForView(
        viewMode || currentViewMode,
        actualDaysInView,
      )
      const newLevel = Math.min(maxZoom, zoomLevel + ZOOM_STEP)
      setZoomLevel(newLevel)
    },
    [zoomLevel, setZoomLevel, currentViewMode, actualDaysInView],
  )

  const zoomOut = useCallback(
    (viewMode?: "week" | "month") => {
      const newLevel = Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP)
      setZoomLevel(newLevel)
    },
    [zoomLevel, setZoomLevel],
  )

  const resetZoom = useCallback(() => {
    setZoomLevel(DEFAULT_ZOOM)
  }, [setZoomLevel])

  const applyPreset = useCallback(
    (preset: ZoomPreset) => {
      setZoomLevel(preset.scale)
    },
    [setZoomLevel],
  )

  const value = useMemo(
    () => ({
      zoomLevel,
      presets: ZOOM_PRESETS,
      currentPreset,
      currentViewMode,
      currentGridState,
      viewStart,
      viewEnd,
      actualDaysInView,
      setZoomLevel,
      zoomIn,
      zoomOut,
      resetZoom,
      applyPreset,
      switchViewMode,
      setViewDates,
      getMinZoom,
      getMaxZoom,
      dayWidth,
      roomHeight,
      fontSize,
      padding,
      isLargeScreen,
      maxContentWidth,
    }),
    [
      zoomLevel,
      currentPreset,
      currentViewMode,
      currentGridState,
      viewStart,
      viewEnd,
      actualDaysInView,
      setZoomLevel,
      zoomIn,
      zoomOut,
      resetZoom,
      applyPreset,
      switchViewMode,
      setViewDates,
      getMinZoom,
      getMaxZoom,
      dayWidth,
      roomHeight,
      fontSize,
      padding,
      isLargeScreen,
      maxContentWidth,
    ],
  )

  return (
    <GridZoomContext.Provider value={value}>
      {children}
    </GridZoomContext.Provider>
  )
}

export function useGridZoom() {
  const context = useContext(GridZoomContext)
  if (!context) {
    throw new Error("useGridZoom must be used within GridZoomProvider")
  }
  return context
}
