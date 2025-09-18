import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

interface ZoomPreset {
  name: string
  scale: number
  daysPerView: number
  description: string
}

interface GridZoomContextValue {
  // Current zoom level (0.5 - 2.0)
  zoomLevel: number
  // Predefined zoom presets
  presets: ZoomPreset[]
  // Current preset (if matches)
  currentPreset: ZoomPreset | null
  // Actions
  setZoomLevel: (level: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  applyPreset: (preset: ZoomPreset) => void
  // Computed values
  dayWidth: number
  roomHeight: number
  fontSize: number
  padding: number
}

const ZOOM_PRESETS: ZoomPreset[] = [
  { name: "Compact", scale: 0.5, daysPerView: 14, description: "2 weeks view" },
  { name: "Normal", scale: 1.0, daysPerView: 7, description: "1 week view" },
  { name: "Detailed", scale: 1.5, daysPerView: 5, description: "5 days view" },
  { name: "Large", scale: 2.0, daysPerView: 3, description: "3 days view" },
]

const DEFAULT_ZOOM = 1.0
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.1

const GridZoomContext = createContext<GridZoomContextValue | null>(null)

interface GridZoomProviderProps {
  children: ReactNode
}

export function GridZoomProvider({ children }: GridZoomProviderProps) {
  // Load saved zoom from localStorage
  const [zoomLevel, setZoomLevelState] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("booking-grid-zoom")
      return saved ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, parseFloat(saved))) : DEFAULT_ZOOM
    }
    return DEFAULT_ZOOM
  })

  // Save zoom level to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("booking-grid-zoom", zoomLevel.toString())
  }, [zoomLevel])

  // Find current preset if zoom matches
  const currentPreset = useMemo(
    () => ZOOM_PRESETS.find((p) => Math.abs(p.scale - zoomLevel) < 0.05) || null,
    [zoomLevel]
  )

  // Computed dimensions based on zoom level
  const dayWidth = useMemo(() => {
    // Base width for a day at zoom 1.0 is ~114px (800px / 7 days)
    return Math.round(114 * zoomLevel)
  }, [zoomLevel])

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

  // Actions
  const setZoomLevel = useCallback((level: number) => {
    setZoomLevelState(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level)))
  }, [])

  const zoomIn = useCallback(() => {
    setZoomLevel(zoomLevel + ZOOM_STEP)
  }, [zoomLevel, setZoomLevel])

  const zoomOut = useCallback(() => {
    setZoomLevel(zoomLevel - ZOOM_STEP)
  }, [zoomLevel, setZoomLevel])

  const resetZoom = useCallback(() => {
    setZoomLevel(DEFAULT_ZOOM)
  }, [setZoomLevel])

  const applyPreset = useCallback((preset: ZoomPreset) => {
    setZoomLevel(preset.scale)
  }, [setZoomLevel])

  const value = useMemo(
    () => ({
      zoomLevel,
      presets: ZOOM_PRESETS,
      currentPreset,
      setZoomLevel,
      zoomIn,
      zoomOut,
      resetZoom,
      applyPreset,
      dayWidth,
      roomHeight,
      fontSize,
      padding,
    }),
    [
      zoomLevel,
      currentPreset,
      setZoomLevel,
      zoomIn,
      zoomOut,
      resetZoom,
      applyPreset,
      dayWidth,
      roomHeight,
      fontSize,
      padding,
    ]
  )

  return <GridZoomContext.Provider value={value}>{children}</GridZoomContext.Provider>
}

export function useGridZoom() {
  const context = useContext(GridZoomContext)
  if (!context) {
    throw new Error("useGridZoom must be used within GridZoomProvider")
  }
  return context
}