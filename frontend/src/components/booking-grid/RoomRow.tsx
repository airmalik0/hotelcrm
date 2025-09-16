import { memo, useRef, useMemo } from "react"
import type { RoomPublic, BookingPublic } from "@/client/types.gen"
import { BookingBlock } from "./BookingBlock"
import { calculateBookingPosition, getBookingTimesFromClick } from "@/utils/date-helpers"
import { assignBookingLanes } from "@/utils/booking-grid"
import type { ViewMode } from "@/utils/date-helpers"
import clsx from "clsx"

interface RoomRowProps {
  room: RoomPublic
  bookings: BookingPublic[]
  viewStart: Date
  viewEnd: Date
  viewMode?: ViewMode
  onBookingClick: (booking: BookingPublic) => void
  onEmptyClick: (room: RoomPublic, checkIn: Date, checkOut: Date) => void
  onBookingHover?: (booking: BookingPublic, event: React.MouseEvent) => void
  onBookingLeave?: () => void
  onBookingDragStart?: (e: React.DragEvent, booking: BookingPublic) => void
  onBookingDragEnd?: (e: React.DragEvent) => void
  onRoomDragOver?: (e: React.DragEvent, room: RoomPublic) => void
  onRoomDragLeave?: (e: React.DragEvent) => void
  onRoomDrop?: (e: React.DragEvent, room: RoomPublic) => void
  selectedBookingId?: string
  isDraggedBooking?: (bookingId: string) => boolean
  isDropTarget?: boolean
  isValidDropTarget?: boolean
}

export const RoomRow = memo(function RoomRow({
  room,
  bookings,
  viewStart,
  viewEnd,
  viewMode = "week",
  onBookingClick,
  onEmptyClick,
  onBookingHover,
  onBookingLeave,
  onBookingDragStart,
  onBookingDragEnd,
  onRoomDragOver,
  onRoomDragLeave,
  onRoomDrop,
  selectedBookingId,
  isDraggedBooking,
  isDropTarget = false,
  isValidDropTarget = false,
}: RoomRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate lanes for bookings in month view to prevent overlap
  const bookingsWithLanes = useMemo(() => {
    if (viewMode === "month" && bookings.length > 0) {
      return assignBookingLanes(bookings, viewStart, viewEnd)
    }
    return bookings.map(b => ({ ...b, lane: 0 }))
  }, [bookings, viewMode, viewStart, viewEnd])

  // Calculate the height needed based on the maximum lane
  const maxLane = useMemo(() => {
    return bookingsWithLanes.reduce((max, b) => Math.max(max, b.lane), 0)
  }, [bookingsWithLanes])

  // Dynamic height based on number of lanes (for month view)
  const rowHeight = viewMode === "month" ? `${Math.max(64, 48 + maxLane * 32)}px` : "64px"

  const handleEmptyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only handle clicks on the container itself, not on bookings
    if (event.target !== event.currentTarget) return

    const container = containerRef.current
    if (!container) return

    // Use offsetX which accounts for element's padding and border
    const clickX = event.nativeEvent.offsetX
    const containerWidth = container.offsetWidth

    const { checkIn, checkOut } = getBookingTimesFromClick(
      clickX,
      containerWidth,
      viewStart,
      viewEnd
    )

    onEmptyClick(room, checkIn, checkOut)
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative cursor-pointer room-drop-zone border-b border-neutral-200 dark:border-neutral-700 transition-colors",
        isDropTarget && isValidDropTarget && "bg-green-50 dark:bg-green-900/20",
        isDropTarget && !isValidDropTarget && "bg-red-50 dark:bg-red-900/20",
        !isDropTarget && "hover:bg-neutral-50 dark:hover:bg-dark-3"
      )}
      style={{ height: rowHeight }}
      onClick={handleEmptyClick}
      onDragOver={(e) => onRoomDragOver?.(e, room)}
      onDragLeave={onRoomDragLeave}
      onDrop={(e) => onRoomDrop?.(e, room)}
    >
      {/* Render bookings */}
      {bookingsWithLanes.map((booking) => {
        const position = calculateBookingPosition(
          booking.check_in,
          booking.check_out,
          viewStart,
          viewEnd
        )

        // Skip bookings completely outside the view
        if (!position) {
          return null
        }

        // Calculate vertical position based on lane for month view
        const topOffset = viewMode === "month"
          ? `${4 + booking.lane * 28}px`  // Stack bookings with 28px spacing
          : "4px"  // Default top position for week view

        return (
          <BookingBlock
            key={booking.id}
            booking={booking}
            position={{
              ...position,
              top: topOffset
            }}
            onClick={onBookingClick}
            onMouseEnter={onBookingHover}
            onMouseLeave={onBookingLeave}
            onDragStart={onBookingDragStart}
            onDragEnd={onBookingDragEnd}
            isDragging={isDraggedBooking?.(booking.id) || false}
            isSelected={booking.id === selectedBookingId}
          />
        )
      })}
    </div>
  )
})