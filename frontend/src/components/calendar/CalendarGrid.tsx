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

  // Generate grid lines for visual guidance
  const gridLines = useMemo(() => {
    const lines: Array<{ position: number; isMain: boolean }> = []
    const totalHours = (viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60)

    if (viewMode === "week") {
      // Show lines every 6 hours for week view
      for (let hour = 0; hour <= totalHours; hour += 6) {
        const isMain = hour % 24 === 0 // Main lines at midnight
        lines.push({ position: (hour / totalHours) * 100, isMain })
      }
    } else {
      // Show lines every day for month view
      for (let day = 0; day <= Math.ceil(totalHours / 24); day++) {
        const hour = day * 24
        const position = (hour / totalHours) * 100
        if (position <= 100) {
          const date = new Date(viewStart.getTime() + hour * 60 * 60 * 1000)
          const isMain = date.getDay() === 0 || date.getDate() === 1 // Sundays and 1st of month
          lines.push({ position, isMain })
        }
      }
    }

    return lines
  }, [viewMode, viewStart, viewEnd])

  return (
    <>
      <div ref={gridRef} className="relative w-full bg-white dark:bg-dark-2">
        {/* Grid lines for visual guidance - must match TimeScale positions */}
        <div className="absolute inset-0 pointer-events-none">
          {gridLines.map((line, index) => (
            <div
              key={index}
              className={`
                absolute top-0 bottom-0 w-px
                ${line.isMain
                  ? "bg-neutral-300 dark:bg-neutral-600 opacity-100"
                  : "bg-neutral-200 dark:bg-neutral-700 opacity-75"}
              `}
              style={{ left: `${line.position}%` }}
            />
          ))}
        </div>

        {/* Room rows */}
        {rooms.map((room, index) => {
          const roomBookings = bookingsByRoom.get(room.id) || []

          return (
            <div
              key={room.id}
              className={`
                calendar-row relative h-[60px] border-b border-neutral-200 dark:border-neutral-600
                ${canCreate ? "cursor-crosshair" : ""}
                ${index % 2 === 0
                  ? "bg-white/50 dark:bg-dark-2/50"
                  : "bg-neutral-50/50 dark:bg-dark-3/50"}
                hover:bg-neutral-100/50 dark:hover:bg-dark-3/70 transition-colors
              `}
              onClick={(e) => handleEmptySlotClick(e, room.id)}
              data-room-id={room.id}
            >
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

        {/* Current time indicator line */}
        {(() => {
          const now = new Date()
          if (now >= viewStart && now <= viewEnd) {
            const totalHours = (viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60)
            const currentOffset = (now.getTime() - viewStart.getTime()) / (1000 * 60 * 60)
            const position = (currentOffset / totalHours) * 100

            return (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 dark:bg-red-400 z-30 pointer-events-none shadow-lg"
                style={{
                  left: `${position}%`,
                  boxShadow: "0 0 8px rgba(239, 68, 68, 0.5)"
                }}
              />
            )
          }
          return null
        })()}
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