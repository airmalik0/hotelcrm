import { getBookings } from "@/api/bookings"
import { getRooms } from "@/api/rooms"
import type {
  BookingPublic,
  BookingStatus,
  RoomPublic,
} from "@/client/types.gen"
import { GridZoomProvider, useGridZoom } from "@/contexts/GridZoomContext"
import { useBookingDrag } from "@/hooks/useBookingDrag"
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
import { useEffect, useMemo, useState } from "react"
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
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  )

  // Get zoom context
  const { zoomLevel, dayWidth, roomHeight } = useGridZoom()
  const gridContainerRef = useGridZoomControls({ enabled: true })

  // Touch device detection only (for drag-n-drop)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Only detect touch capability once on mount
    const checkTouch = () => {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0
    }
    setIsTouchDevice(checkTouch())
  }, [])

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
        filteredBookings,
        filteredRooms,
        viewStart,
        viewEnd,
      ),
    [filteredBookings, filteredRooms, viewStart, viewEnd],
  )

  // Drag & Drop functionality
  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    createDragImageContainer,
    isUpdating,
  } = useBookingDrag(allBookings)

  // Create drag image container on mount
  useEffect(() => {
    createDragImageContainer()
  }, [createDragImageContainer])

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
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
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
    // TODO: Show tooltip
  }

  const handleBookingLeave = () => {
    // TODO: Hide tooltip
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

      {/* Grid Controls - hide on mobile using CSS */}
      <div className="hidden md:block relative z-20">
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
        />
      </div>

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
          {/* Mobile view - vertical list */}
          <div className="block md:hidden">
            <MobileBookingList
              rooms={filteredRooms}
              bookings={filteredBookings}
              viewStart={viewStart}
              viewEnd={viewEnd}
              onBookingClick={handleBookingClick}
              onEmptyClick={handleEmptyClick}
              selectedBookingId={selectedBookingId}
            />
          </div>

          {/* Desktop/Tablet view - CSS Grid */}
          <div className="hidden md:block">
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
              <div className="relative overflow-x-auto" ref={gridContainerRef}>
                {/* Main Grid */}
                <div
                  className="grid bg-white dark:bg-dark-2"
                  style={{
                    gridTemplateColumns: "200px 1fr",
                    minWidth: viewMode === "week"
                      ? `${200 + dayWidth * 7}px`
                      : `${200 + dayWidth * 30}px`,
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
                      height={roomHeight}
                      onBookingClick={handleBookingClick}
                      onEmptyClick={handleEmptyClick}
                      onBookingHover={handleBookingHover}
                      onBookingLeave={handleBookingLeave}
                      onBookingDragStart={handleDragStart}
                      onBookingDragEnd={handleDragEnd}
                      onRoomDragOver={handleDragOver}
                      onRoomDragLeave={handleDragLeave}
                      onRoomDrop={handleDrop}
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
                    right: 0,
                    minWidth: viewMode === "week"
                      ? `${dayWidth * 7}px`
                      : `${dayWidth * 30}px`,
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
          setSelectedBookingId(null)
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
