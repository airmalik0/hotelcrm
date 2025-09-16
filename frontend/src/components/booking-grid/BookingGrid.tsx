import { useState, useMemo, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { addDays, addWeeks, addMonths, subWeeks, subMonths } from "date-fns"
import type { BookingPublic, RoomPublic, BookingStatus } from "@/client/types.gen"
import type { ViewMode } from "@/utils/date-helpers"
import { getViewDateRange } from "@/utils/date-helpers"
import { groupBookingsByRoom, sortRoomsByNumber, calculateOccupancy, formatRoomName } from "@/utils/booking-grid"
import { filterBookings, filterRooms, getUniqueRoomTypes, calculateFilteredStats } from "@/utils/booking-filters"
import { getRoomStatusColor, getRoomTypeColor } from "@/utils/booking-colors"
import type { BookingFilters } from "@/utils/booking-filters"
import { getBookings } from "@/api/bookings"
import { getRooms } from "@/api/rooms"
import { useBookingDrag } from "@/hooks/useBookingDrag"
import { useDebounce } from "@/hooks/useDebounce"
import { useBreakpoints } from "@/hooks/useMediaQuery"
import { useSwipe } from "@/hooks/useSwipe"
import { GridHeader } from "./GridHeader"
import { GridControls } from "./GridControls"
import { TimeScale } from "./TimeScale"
import { RoomRow } from "./RoomRow"
import { TodayLine } from "./TodayLine"
import { QuickBookingModal } from "./QuickBookingModal"
import { BookingDetailModal } from "./BookingDetailModal"
import { MobileBookingList } from "./MobileBookingList"
import { Loader2, GripHorizontal, Bed, DollarSign } from "lucide-react"
import clsx from "clsx"

export function BookingGrid() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  // Use CSS-based responsive hooks
  const { isMobile, isTablet, isDesktop, isTouchDevice } = useBreakpoints()

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
    [filters.statusFilters, filters.roomTypeFilters, debouncedSearchTerm]
  )

  // Calculate view range
  const { start: viewStart, end: viewEnd } = useMemo(
    () => getViewDateRange(currentDate, viewMode),
    [currentDate, viewMode]
  )

  // Fetch rooms
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ limit: 100 }),
  })

  // Fetch bookings for the current view
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", viewStart.toISOString(), viewEnd.toISOString()],
    queryFn: () => getBookings({
      date_from: viewStart.toISOString(),
      date_to: viewEnd.toISOString(),
      limit: 500,
    }),
  })

  // Apply filters to data
  const allRooms = useMemo(
    () => sortRoomsByNumber(roomsData?.data || []),
    [roomsData]
  )

  const allBookings = bookingsData?.data || []

  const filteredBookings = useMemo(
    () => filterBookings(allBookings, debouncedFilters),
    [allBookings, debouncedFilters]
  )

  const filteredRooms = useMemo(
    () => filterRooms(allRooms, filteredBookings, debouncedFilters.roomTypeFilters),
    [allRooms, filteredBookings, debouncedFilters.roomTypeFilters]
  )

  const bookingsByRoom = useMemo(
    () => groupBookingsByRoom(filteredBookings),
    [filteredBookings]
  )

  const availableRoomTypes = useMemo(
    () => getUniqueRoomTypes(allRooms),
    [allRooms]
  )

  const filteredStats = useMemo(
    () => calculateFilteredStats(filteredBookings, filteredRooms, viewStart, viewEnd),
    [filteredBookings, filteredRooms, viewStart, viewEnd]
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

  // Close sidebar when resizing to desktop
  useEffect(() => {
    if (isDesktop) {
      setIsSidebarOpen(false)
    }
  }, [isDesktop])

  // Navigation handlers - use full week jump and full month jump
  // Because startOfWeek/startOfMonth snap to period boundaries
  const handlePrevious = () => {
    setCurrentDate((prev) =>
      viewMode === "week"
        ? addWeeks(prev, -1)  // Jump to previous week
        : addMonths(prev, -1) // Jump to previous month
    )
  }

  const handleNext = () => {
    setCurrentDate((prev) =>
      viewMode === "week"
        ? addWeeks(prev, 1)   // Jump to next week
        : addMonths(prev, 1)  // Jump to next month
    )
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
  }

  // Swipe handlers for tablet view (must be after navigation handlers)
  const swipeRef = useSwipe<HTMLDivElement>({
    onSwipeLeft: () => isTablet && handleNext(),
    onSwipeRight: () => isTablet && handlePrevious(),
    threshold: 75
  })

  // Filter handlers
  const handleSearchChange = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }))
  }

  const handleStatusFilterChange = (statusFilters: BookingStatus[]) => {
    setFilters(prev => ({ ...prev, statusFilters }))
  }

  const handleRoomTypeFilterChange = (roomTypeFilters: string[]) => {
    setFilters(prev => ({ ...prev, roomTypeFilters }))
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

  const handleEmptyClick = (room: RoomPublic, checkIn: Date, checkOut: Date) => {
    // Open modal with pre-filled room and times
    setQuickBookingModal({
      isOpen: true,
      room,
      checkIn,
      checkOut,
    })
  }

  const handleBookingHover = (booking: BookingPublic, event: React.MouseEvent) => {
    // TODO: Show tooltip
    console.log("Booking hover:", booking)
  }

  const handleBookingLeave = () => {
    // TODO: Hide tooltip
    console.log("Booking leave")
  }

  const isLoading = roomsLoading || bookingsLoading

  return (
    <div className="flex flex-col h-screen bg-neutral-50 dark:bg-dark-1 overflow-hidden">
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
      <div className="hidden md:block">
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
      <div className="flex-1 min-h-0 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin mx-auto mb-3" />
              <p className="text-neutral-600 dark:text-neutral-400">Loading bookings...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile view - vertical list */}
            <div className="block md:hidden h-full overflow-y-auto">
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
            {/* Desktop/Tablet view - grid */}
            <div className="hidden md:block h-full overflow-hidden">
              {filteredRooms.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                      {allRooms.length === 0
                        ? "No rooms available. Please add rooms to start managing bookings."
                        : "No rooms match your current filters. Try adjusting your search criteria."
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative h-full">
                  <div className="absolute inset-0 flex overflow-hidden">
              {/* Sticky room sidebar - pinned on tablets */}
              <div className={clsx(
                "flex-shrink-0 bg-white dark:bg-dark-2 border-r border-neutral-200 dark:border-neutral-600 transition-all duration-300",
                "md:sticky md:left-0 md:w-32 lg:w-48",
                "overflow-y-auto overflow-x-hidden"
              )}>
                {/* Spacer for header */}
                <div className="h-10 border-b border-neutral-200 dark:border-neutral-600" />

                {/* Room list - responsive layout */}
                {filteredRooms.map((room) => (
                  <div key={room.id} className={clsx(
                    "border-b border-neutral-200 dark:border-neutral-700 p-2 md:p-3",
                    "h-16 md:h-16 lg:h-16" // Consistent heights across breakpoints
                  )}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 md:gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base text-neutral-900 dark:text-white truncate">
                              {formatRoomName(room)}
                            </h3>
                            <span className={clsx("text-xs px-2 py-0.5 rounded-full hidden lg:inline-block", getRoomTypeColor(room.room_type))}>
                              {room.room_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center gap-1">
                              <Bed className="w-3 h-3" />
                              <span className="hidden md:inline">{room.capacity}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span className="hidden lg:inline">${room.price_per_night}</span>
                            </div>
                          </div>
                        </div>
                        <div className={clsx("text-xs px-1 md:px-2 py-0.5 md:py-1 rounded hidden md:block", getRoomStatusColor(room.status))}>
                          {room.status.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                ))}
              </div>

              {/* Scrollable timeline area - swipeable on tablets */}
              <div
                className="flex-1 overflow-x-auto overflow-y-auto touch-pan-x"
                ref={swipeRef}
              >
                <div className="min-w-[800px] md:min-w-[1200px] lg:min-w-[1000px]">
                  {/* Time scale header */}
                  <div className="sticky top-0 z-10 bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600">
                    <TimeScale viewStart={viewStart} viewEnd={viewEnd} viewMode={viewMode} />
                  </div>

                  {/* Bookings grid */}
                  <div className="relative">
                    {/* Today line */}
                    <TodayLine viewStart={viewStart} viewEnd={viewEnd} />

                    {/* Room booking rows */}
                    {filteredRooms.map((room) => (
                      <RoomRow
                        key={room.id}
                        room={room}
                        bookings={bookingsByRoom.get(room.id) || []}
                        viewStart={viewStart}
                        viewEnd={viewEnd}
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
                        isDraggedBooking={(id) => dragState.draggedBooking?.id === id}
                        isDropTarget={dragState.dragOverRoomId === room.id}
                        isValidDropTarget={dragState.dragOverRoomId === room.id && dragState.isValidDrop}
                        isTouchDevice={isTouchDevice}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
                </div>
              )}
            </div>

          </>
        )}
      </div>

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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <GripHorizontal className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isUpdating ? "Moving booking..." : "Drag to another room"}
          </span>
        </div>
      )}
    </div>
  )
}