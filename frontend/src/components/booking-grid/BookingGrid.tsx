import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { addDays, addWeeks, addMonths } from "date-fns"
import type { BookingPublic, RoomPublic } from "@/client/types.gen"
import type { ViewMode } from "@/utils/date-helpers"
import { getViewDateRange } from "@/utils/date-helpers"
import { groupBookingsByRoom, sortRoomsByNumber, calculateOccupancy } from "@/utils/booking-grid"
import { getBookings } from "@/api/bookings"
import { getRooms } from "@/api/rooms"
import { GridHeader } from "./GridHeader"
import { TimeScale } from "./TimeScale"
import { RoomRow } from "./RoomRow"
import { TodayLine } from "./TodayLine"
import { QuickBookingModal } from "./QuickBookingModal"
import { BookingDetailModal } from "./BookingDetailModal"
import { Loader2 } from "lucide-react"

export function BookingGrid() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  // Modal state
  const [quickBookingModal, setQuickBookingModal] = useState<{
    isOpen: boolean
    room?: RoomPublic
    checkIn?: Date
    checkOut?: Date
  }>({ isOpen: false })

  const [detailModalOpen, setDetailModalOpen] = useState(false)

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

  const rooms = useMemo(
    () => sortRoomsByNumber(roomsData?.data || []),
    [roomsData]
  )

  const bookingsByRoom = useMemo(
    () => groupBookingsByRoom(bookingsData?.data || []),
    [bookingsData]
  )

  const occupancyRate = useMemo(
    () => calculateOccupancy(rooms, bookingsData?.data || [], viewStart, viewEnd),
    [rooms, bookingsData, viewStart, viewEnd]
  )

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
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-dark-1">
      {/* Header */}
      <GridHeader
        currentDate={currentDate}
        viewMode={viewMode}
        viewStart={viewStart}
        viewEnd={viewEnd}
        occupancyRate={occupancyRate}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onViewModeChange={handleViewModeChange}
        onAddBooking={handleAddBooking}
      />

      {/* Grid container */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin mx-auto mb-3" />
              <p className="text-neutral-600 dark:text-neutral-400">Loading bookings...</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                No rooms available. Please add rooms to start managing bookings.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="min-w-[1200px]">
              {/* Time scale header */}
              <div className="sticky top-0 z-10 flex">
                <div className="w-48 flex-shrink-0 bg-white dark:bg-dark-2 border-b border-r border-neutral-200 dark:border-neutral-600" />
                <div className="flex-1">
                  <TimeScale viewStart={viewStart} viewEnd={viewEnd} viewMode={viewMode} />
                </div>
              </div>

              {/* Room rows */}
              <div className="relative">
                {/* Today line */}
                <div className="absolute top-0 bottom-0 left-48 right-0">
                  <TodayLine viewStart={viewStart} viewEnd={viewEnd} />
                </div>

                {/* Room rows with bookings */}
                {rooms.map((room) => (
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
                    selectedBookingId={selectedBookingId}
                  />
                ))}
              </div>
            </div>
          </div>
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
    </div>
  )
}