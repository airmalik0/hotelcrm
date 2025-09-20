import { getBookings } from "@/api/bookings"
import { getRooms } from "@/api/rooms"
import type {
  BookingPublic,
  BookingStatus,
  RoomPublic,
} from "@/client/types.gen"
import { GridZoomProvider, useGridZoom } from "@/contexts/GridZoomContext"
import type { RoomChangeData } from "@/hooks/useBookingDrag"
import { useBookingDrag } from "@/hooks/useBookingDrag"
import { useConfirm } from "@/hooks/useConfirm"
import { useDebounce } from "@/hooks/useDebounce"
import { useGridZoomControls } from "@/hooks/useGridZoomControls"
import {
  calculateFilteredStats,
  filterBookings,
  filterRooms,
  getUniqueRoomTypes,
} from "@/utils/booking-filters"
import type { BookingFilters } from "@/utils/booking-filters"
import { groupBookingsByRoom, sortRoomsByNumber } from "@/utils/booking-grid"
import type { ViewMode } from "@/utils/date-helpers"
import { getViewDateRange } from "@/utils/date-helpers"
import { useQuery } from "@tanstack/react-query"
import { addMonths, addWeeks } from "date-fns"
import { GripHorizontal, Loader2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { BookingDetailModal } from "./BookingDetailModal"
import { GridControls } from "./GridControls"
import { GridHeader } from "./GridHeader"
import { QuickBookingModal } from "./QuickBookingModal"
import { RoomCell } from "./desktop/RoomCell"
import { RoomTimeline } from "./desktop/RoomTimeline"
import { TimeScale } from "./desktop/TimeScale"
import { TimelineGrid } from "./desktop/TimelineGrid"
import { TodayLine } from "./desktop/TodayLine"
import { MobileBookingList } from "./mobile/MobileBookingList"

function BookingGridContent() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [selectedBookingId, setSelectedBookingId] = useState<
    string | undefined
  >(undefined)

  // Get zoom context and dimensions
  const {
    zoomLevel,
    roomHeight,
    dayWidth,
    actualDaysInView,
    switchViewMode,
    setViewDates,
    currentGridState,
    isDesktop,
  } = useGridZoom()
  const gridContainerRef = useGridZoomControls({ enabled: true, viewMode })

  // Touch device detection only (for drag-n-drop)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Only detect touch capability once on mount
    const checkTouch = () => {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0
    }
    setIsTouchDevice(checkTouch())
  }, [])

  // Sync initial viewMode with context
  useEffect(() => {
    switchViewMode(viewMode)
  }, [switchViewMode, viewMode])

  // Modal state
  const [quickBookingModal, setQuickBookingModal] = useState<{
    isOpen: boolean
    room?: RoomPublic
    checkIn?: Date
    checkOut?: Date
  }>({ isOpen: false })

  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Filter state
  const [filters, setFilters] = useState<BookingFilters>({
    searchTerm: "",
    statusFilters: [],
    roomTypeFilters: [],
  })

  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300)
  const debouncedFilters = useMemo(
    () => ({ ...filters, searchTerm: debouncedSearchTerm }),
    [filters.statusFilters, filters.roomTypeFilters, debouncedSearchTerm],
  )

  // Calculate view range
  const { start: viewStart, end: viewEnd } = useMemo(
    () => getViewDateRange(currentDate, viewMode),
    [currentDate, viewMode],
  )

  // Update context with current view dates
  useEffect(() => {
    setViewDates(viewStart, viewEnd)
  }, [viewStart, viewEnd, setViewDates])

  // Fetch rooms
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ limit: 100 }),
  })

  // Fetch bookings for the current view
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", viewStart.toISOString(), viewEnd.toISOString()],
    queryFn: () =>
      getBookings({
        date_from: viewStart.toISOString(),
        date_to: viewEnd.toISOString(),
        limit: 500,
      }),
  })

  // Apply filters to data (filter out maintenance rooms from display)
  const allRooms = useMemo(
    () =>
      sortRoomsByNumber(
        (roomsData?.data || []).filter((room) => room.status !== "maintenance"),
      ),
    [roomsData],
  )

  const allBookings = bookingsData?.data || []

  const filteredBookings = useMemo(
    () => filterBookings(allBookings, debouncedFilters),
    [allBookings, debouncedFilters],
  )

  const filteredRooms = useMemo(
    () =>
      filterRooms(allRooms, filteredBookings, debouncedFilters.roomTypeFilters),
    [allRooms, filteredBookings, debouncedFilters.roomTypeFilters],
  )

  const bookingsByRoom = useMemo(
    () => groupBookingsByRoom(filteredBookings),
    [filteredBookings],
  )

  const availableRoomTypes = useMemo(
    () => getUniqueRoomTypes(allRooms),
    [allRooms],
  )

  const filteredStats = useMemo(
    () =>
      calculateFilteredStats(
        allBookings,
        filteredBookings,
        filteredRooms,
        viewStart,
        viewEnd,
      ),
    [allBookings, filteredBookings, filteredRooms, viewStart, viewEnd],
  )

  // Drag & Drop functionality
  const { confirm, ConfirmDialog } = useConfirm()
  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    calculateRoomChangeData,
    isUpdating,
  } = useBookingDrag(allBookings)

  // Handle room drop with confirmation
  const handleRoomDrop = useCallback(
    async (e: React.DragEvent, room: RoomPublic) => {
      await handleDrop(e, room, async (data: RoomChangeData) => {
        const message = (
          <div className="space-y-3">
            <div className="text-sm">
              Move booking from{" "}
              <span className="font-medium">
                Room {data.fromRoom?.room_number}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                Room {data.toRoom.room_number}
              </span>
              ?
            </div>
            {data.actualDiff > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 text-sm border border-orange-200 dark:border-orange-600/50">
                <div className="font-medium text-orange-800 dark:text-orange-300">
                  Additional charge: ${data.actualDiff.toFixed(2)}
                </div>
                <div className="text-orange-700 dark:text-orange-400 text-xs mt-1">
                  ({data.nights} nights × ${Math.abs(data.priceDiff).toFixed(2)}
                  /night
                  {data.discount && ` with ${data.discount}% discount`})
                </div>
              </div>
            )}
            {data.actualDiff < 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3 text-sm border border-emerald-200 dark:border-emerald-600/50">
                <div className="font-medium text-emerald-800 dark:text-emerald-300">
                  Refund amount: ${Math.abs(data.actualDiff).toFixed(2)}
                </div>
                <div className="text-emerald-700 dark:text-emerald-400 text-xs mt-1">
                  ({data.nights} nights × ${Math.abs(data.priceDiff).toFixed(2)}
                  /night
                  {data.discount && ` with ${data.discount}% discount`})
                </div>
              </div>
            )}
            {data.actualDiff === 0 && (
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
                Same price - no payment adjustment needed
              </div>
            )}
          </div>
        )

        return await confirm({
          title: "Confirm Room Change",
          message,
          confirmText: "Change Room",
          variant:
            data.actualDiff > 0
              ? "warning"
              : data.actualDiff < 0
                ? "success"
                : "primary",
        })
      })
    },
    [handleDrop, confirm],
  )

  // Navigation handlers - use full week jump and full month jump
  // Because startOfWeek/startOfMonth snap to period boundaries
  const handlePrevious = () => {
    setCurrentDate(
      (prev) =>
        viewMode === "week"
          ? addWeeks(prev, -1) // Jump to previous week
          : addMonths(prev, -1), // Jump to previous month
    )
  }

  const handleNext = () => {
    setCurrentDate(
      (prev) =>
        viewMode === "week"
          ? addWeeks(prev, 1) // Jump to next week
          : addMonths(prev, 1), // Jump to next month
    )
  }

  const handleToday = () => {
    setCurrentDate(new Date())

    // Center today's column in the grid
    requestAnimationFrame(() => {
      if (gridContainerRef.current) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Calculate days from view start to today
        const msPerDay = 24 * 60 * 60 * 1000
        const daysSinceStart = Math.floor(
          (today.getTime() - viewStart.getTime()) / msPerDay,
        )

        // Only scroll if today is within the current view
        if (
          daysSinceStart >= 0 &&
          daysSinceStart < (viewMode === "week" ? 7 : 30)
        ) {
          // Calculate pixel position of today's column
          // Account for the 200px room column + day columns
          const todayPixelPos = 200 + daysSinceStart * dayWidth + dayWidth / 2

          // Get container width and calculate center position
          const containerWidth = gridContainerRef.current.clientWidth
          const scrollLeft = todayPixelPos - containerWidth / 2

          gridContainerRef.current.scrollTo({
            left: Math.max(0, scrollLeft),
            behavior: "smooth",
          })
        }
      }
    })
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    switchViewMode(mode)
  }

  // Filter handlers
  const handleSearchChange = (searchTerm: string) => {
    setFilters((prev) => ({ ...prev, searchTerm }))
  }

  const handleStatusFilterChange = (statusFilters: BookingStatus[]) => {
    setFilters((prev) => ({ ...prev, statusFilters }))
  }

  const handleRoomTypeFilterChange = (roomTypeFilters: string[]) => {
    setFilters((prev) => ({ ...prev, roomTypeFilters }))
  }

  const handleClearAllFilters = () => {
    setFilters({
      searchTerm: "",
      statusFilters: [],
      roomTypeFilters: [],
    })
  }

  const handleAddBooking = () => {
    // Open modal without pre-filled data
    setQuickBookingModal({
      isOpen: true,
      checkIn: new Date(),
      checkOut: undefined,
    })
  }

  const handleBookingClick = (booking: BookingPublic) => {
    setSelectedBookingId(booking.id)
    setDetailModalOpen(true)
  }

  const handleEmptyClick = (
    room: RoomPublic,
    checkIn: Date,
    checkOut: Date,
  ) => {
    // Open modal with pre-filled room and times
    setQuickBookingModal({
      isOpen: true,
      room,
      checkIn,
      checkOut,
    })
  }

  const handleBookingHover = (
    booking: BookingPublic,
    event: React.MouseEvent,
  ) => {
    // Reserved for future tooltip implementation
    // Could show booking details, guest info, or status on hover
  }

  const handleBookingLeave = () => {
    // Reserved for future tooltip implementation
    // Would hide the tooltip shown in handleBookingHover
  }

  const isLoading = roomsLoading || bookingsLoading

  return (
    <div className="bg-neutral-50 dark:bg-dark-1">
      {/* Header */}
      <GridHeader
        currentDate={currentDate}
        viewMode={viewMode}
        viewStart={viewStart}
        viewEnd={viewEnd}
        occupancyRate={filteredStats.occupancyRate}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewModeChange={handleViewModeChange}
        onAddBooking={handleAddBooking}
      />

      {/* Grid Controls - show for all states except mobile */}
      {currentGridState !== "mobile" && (
        <div className="relative z-20">
          <GridControls
            searchTerm={filters.searchTerm}
            onSearchChange={handleSearchChange}
            statusFilters={filters.statusFilters}
            onStatusFilterChange={handleStatusFilterChange}
            roomTypeFilters={filters.roomTypeFilters}
            onRoomTypeFilterChange={handleRoomTypeFilterChange}
            availableRoomTypes={availableRoomTypes}
            totalBookings={filteredStats.totalBookings}
            occupancyRate={filteredStats.occupancyRate}
            onClearAllFilters={handleClearAllFilters}
            currentGridState={currentGridState}
          />
        </div>
      )}

      {/* Grid container */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin mx-auto mb-3" />
            <p className="text-neutral-600 dark:text-neutral-400">
              Loading bookings...
            </p>
          </div>
        </div>
      ) : (
        <div>
          {/* Mobile state - vertical list (< 768px) */}
          {currentGridState === "mobile" && (
            <MobileBookingList
              rooms={filteredRooms}
              bookings={filteredBookings}
              viewStart={viewStart}
              viewEnd={viewEnd}
              onBookingClick={handleBookingClick}
              onEmptyClick={handleEmptyClick}
              selectedBookingId={selectedBookingId}
            />
          )}

          {/* Grid views - Tablet and Desktop states (≥ 768px) */}
          {(currentGridState === "tablet" ||
            currentGridState === "desktop") && (
            <div>
              {filteredRooms.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center max-w-md">
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                      {allRooms.length === 0
                        ? "No rooms available. Please add rooms to start managing bookings."
                        : "No rooms match your current filters. Try adjusting your search criteria."}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="relative overflow-x-auto"
                  ref={gridContainerRef}
                >
                  {/* Main Grid */}
                  <div
                    className="grid bg-white dark:bg-dark-2 min-w-fit"
                    style={{
                      gridTemplateColumns: `200px ${dayWidth * actualDaysInView}px`,
                    }}
                  >
                    {/* Header Row */}
                    <div className="sticky left-0 z-30 h-10 bg-white dark:bg-dark-2 border-b border-r border-neutral-200 dark:border-neutral-600" />
                    <div className="h-10 border-b border-neutral-200 dark:border-neutral-600">
                      <TimeScale
                        viewStart={viewStart}
                        viewEnd={viewEnd}
                        viewMode={viewMode}
                      />
                    </div>

                    {/* Room Rows */}
                    {filteredRooms.flatMap((room) => [
                      /* Room Cell */
                      <RoomCell
                        key={`cell-${room.id}`}
                        room={room}
                        height={roomHeight}
                      />,

                      /* Timeline Cell */
                      <RoomTimeline
                        key={`timeline-${room.id}`}
                        room={room}
                        bookings={bookingsByRoom.get(room.id) || []}
                        viewStart={viewStart}
                        viewEnd={viewEnd}
                        viewMode={viewMode}
                        height={roomHeight}
                        onBookingClick={handleBookingClick}
                        onEmptyClick={handleEmptyClick}
                        onBookingHover={handleBookingHover}
                        onBookingLeave={handleBookingLeave}
                        onBookingDragStart={handleDragStart}
                        onBookingDragEnd={handleDragEnd}
                        onRoomDragOver={handleDragOver}
                        onRoomDragLeave={handleDragLeave}
                        onRoomDrop={handleRoomDrop}
                        selectedBookingId={selectedBookingId}
                        isDraggedBooking={(id) =>
                          dragState.draggedBooking?.id === id
                        }
                        isDropTarget={dragState.dragOverRoomId === room.id}
                        isValidDropTarget={
                          dragState.dragOverRoomId === room.id &&
                          dragState.isValidDrop
                        }
                        isTouchDevice={isTouchDevice}
                      />,
                    ])}
                  </div>

                  {/* Overlay container for grid lines and today line */}
                  <div
                    className="absolute top-10 bottom-0 pointer-events-none"
                    style={{
                      left: "200px",
                      width: `${dayWidth * actualDaysInView}px`,
                    }}
                  >
                    {/* Vertical grid lines */}
                    <TimelineGrid
                      viewStart={viewStart}
                      viewEnd={viewEnd}
                      viewMode={viewMode}
                    />
                    {/* Today line */}
                    <TodayLine viewStart={viewStart} viewEnd={viewEnd} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Booking Modal */}
      <QuickBookingModal
        isOpen={quickBookingModal.isOpen}
        onClose={() => setQuickBookingModal({ isOpen: false })}
        room={quickBookingModal.room}
        checkIn={quickBookingModal.checkIn}
        checkOut={quickBookingModal.checkOut}
      />

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedBookingId(undefined)
        }}
        bookingId={selectedBookingId}
      />

      {/* Drag indicator */}
      {dragState.isDragging && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-40">
          <GripHorizontal className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isUpdating ? "Moving booking..." : "Drag to another room"}
          </span>
        </div>
      )}

      {/* Confirm Dialog for room changes */}
      {ConfirmDialog}
    </div>
  )
}

// Export wrapper with zoom provider
export function BookingGrid() {
  return (
    <GridZoomProvider>
      <BookingGridContent />
    </GridZoomProvider>
  )
}
