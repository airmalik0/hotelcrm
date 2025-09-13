import type { RoomPublic } from "@/client/types.gen"
import type { BookingPublic } from "@/client/types.gen"
import type { BookingWithPosition, CalendarViewMode } from "@/types/booking"
import { getMonthEnd, getMonthStart, getTimeFromClick, getWeekEnd, getWeekStart } from "@/types/booking"
import { groupBookingsByRoom } from "@/utils/calendar"
import type React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { BookingBlock } from "./BookingBlock"
import { BookingDetailModal } from "./BookingDetailModal"
import { QuickBookingModal } from "./QuickBookingModal"

interface CalendarGridProps {
  rooms: RoomPublic[]
  bookings: BookingWithPosition[]
  viewMode: CalendarViewMode
  currentDate: Date
  canEdit: boolean
  canCreate: boolean
}

export function CalendarGrid({
  rooms,
  bookings,
  viewMode,
  currentDate,
  canEdit,
  canCreate
}: CalendarGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingPublic | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showQuickBookingModal, setShowQuickBookingModal] = useState(false)
  const [quickBookingData, setQuickBookingData] = useState<{
    roomId: string
    checkIn: Date
  } | null>(null)

  // Calculate view period
  const { viewStart, viewEnd } = useMemo(() => {
    if (viewMode === "week") {
      return {
        viewStart: getWeekStart(currentDate),
        viewEnd: getWeekEnd(currentDate)
      }
    }
      return {
        viewStart: getMonthStart(currentDate),
        viewEnd: getMonthEnd(currentDate)
      }
  }, [viewMode, currentDate])

  // Group bookings by room
  const bookingsByRoom = useMemo(() => {
    return groupBookingsByRoom(bookings)
  }, [bookings])

  // Handle click on empty slot
  const handleEmptySlotClick = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    roomId: string
  ) => {
    if (!canCreate) return

    // Only handle direct clicks on the row, not on bookings
    if ((e.target as HTMLElement).classList.contains("calendar-row")) {
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickTime = getTimeFromClick(clickX, rect.width, viewStart, viewEnd)

      setQuickBookingData({
        roomId,
        checkIn: clickTime
      })
      setShowQuickBookingModal(true)
    }
  }, [canCreate, viewStart, viewEnd])

  // Handle booking click
  const handleBookingClick = useCallback((booking: BookingPublic) => {
    setSelectedBooking(booking)
    setShowDetailModal(true)
  }, [])

  // Constants for better maintainability
  const DAYS_IN_WEEK = 7
  const MS_PER_DAY = 24 * 60 * 60 * 1000

  // Generate day columns for visual shading
  const dayColumns = useMemo(() => {
    const columns: Array<{ leftPercent: number; widthPercent: number; isEven: boolean }> = []

    if (viewMode === "week") {
      // Generate columns for each day of the week
      for (let day = 0; day < DAYS_IN_WEEK; day++) {
        // Use milliseconds for accurate date calculation
        const dayStart = new Date(viewStart.getTime() + day * MS_PER_DAY)
        dayStart.setHours(0, 0, 0, 0)

        const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY)

        const leftPercent = ((dayStart.getTime() - viewStart.getTime()) / (viewEnd.getTime() - viewStart.getTime())) * 100
        const rightPercent = ((dayEnd.getTime() - viewStart.getTime()) / (viewEnd.getTime() - viewStart.getTime())) * 100
        const widthPercent = rightPercent - leftPercent

        columns.push({
          leftPercent,
          widthPercent,
          isEven: day % 2 === 0
        })
      }
    } else {
      // Days for month view
      const totalDays = Math.ceil((viewEnd.getTime() - viewStart.getTime()) / MS_PER_DAY)
      for (let day = 0; day < totalDays; day++) {
        // Use milliseconds for accurate date calculation
        const dayStart = new Date(viewStart.getTime() + day * MS_PER_DAY)
        dayStart.setHours(0, 0, 0, 0)

        const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY)

        const leftPercent = ((dayStart.getTime() - viewStart.getTime()) / (viewEnd.getTime() - viewStart.getTime())) * 100
        const rightPercent = Math.min(100, ((dayEnd.getTime() - viewStart.getTime()) / (viewEnd.getTime() - viewStart.getTime())) * 100)
        const widthPercent = rightPercent - leftPercent

        columns.push({
          leftPercent,
          widthPercent,
          isEven: day % 2 === 0
        })
      }
    }

    return columns
  }, [viewMode, viewStart, viewEnd])

  return (
    <>
      <div ref={gridRef} className="relative w-full bg-white dark:bg-dark-2">
        {/* Room rows */}
        {rooms.map((room, index) => {
          const roomBookings = bookingsByRoom.get(room.id) || []

          return (
            <div
              key={room.id}
              className={`
                calendar-row relative h-[60px] border-b border-neutral-200 dark:border-neutral-600
                ${canCreate ? "cursor-crosshair" : ""}
                hover:bg-neutral-100/30 dark:hover:bg-dark-3/30 transition-colors
              `}
              onClick={(e) => handleEmptySlotClick(e, room.id)}
              data-room-id={room.id}
            >
              {/* Day column backgrounds for chess-board effect */}
              {dayColumns.map((column, colIndex) => (
                <div
                  key={`col-${colIndex}`}
                  className={`absolute top-0 bottom-0 pointer-events-none ${
                    column.isEven
                      ? "bg-neutral-50/50 dark:bg-dark-3/30"
                      : "bg-white dark:bg-dark-2"
                  }`}
                  style={{
                    left: `${column.leftPercent}%`,
                    width: `${column.widthPercent}%`,
                  }}
                />
              ))}

              {/* Booking blocks */}
              {roomBookings.map((booking) => (
                <BookingBlock
                  key={booking.id}
                  booking={booking}
                  onClick={handleBookingClick}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* Quick Booking Modal */}
      {showQuickBookingModal && quickBookingData && (
        <QuickBookingModal
          isOpen={showQuickBookingModal}
          onClose={() => {
            setShowQuickBookingModal(false)
            setQuickBookingData(null)
          }}
          roomId={quickBookingData.roomId}
          initialCheckIn={quickBookingData.checkIn}
          rooms={rooms}
        />
      )}

      {/* Booking Detail Modal */}
      {showDetailModal && selectedBooking && (
        <BookingDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedBooking(null)
          }}
          booking={selectedBooking}
          canEdit={canEdit}
        />
      )}
    </>
  )
}