import { memo, useRef } from "react"
import type { RoomPublic, BookingPublic } from "@/client/types.gen"
import { BookingBlock } from "./BookingBlock"
import { calculateBookingPosition, getBookingTimesFromClick } from "@/utils/date-helpers"
import clsx from "clsx"

interface RoomRowProps {
  room: RoomPublic
  bookings: BookingPublic[]
  viewStart: Date
  viewEnd: Date
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
  isTouchDevice?: boolean
}

export const RoomRow = memo(function RoomRow({
  room,
  bookings,
  viewStart,
  viewEnd,
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
  isTouchDevice = false,
}: RoomRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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
        // CSS-based responsive height
        "h-20 md:h-16",
        // Touch-friendly interaction
        "touch-manipulation",
        isDropTarget && isValidDropTarget && "bg-green-50 dark:bg-green-900/20",
        isDropTarget && !isValidDropTarget && "bg-red-50 dark:bg-red-900/20",
        !isDropTarget && "hover:bg-neutral-50 dark:hover:bg-dark-3"
      )}
      onClick={handleEmptyClick}
      onDragOver={(e) => !isTouchDevice && onRoomDragOver?.(e, room)}
      onDragLeave={!isTouchDevice ? onRoomDragLeave : undefined}
      onDrop={(e) => !isTouchDevice && onRoomDrop?.(e, room)}
    >
      {/* Render bookings */}
      {bookings.map((booking) => {
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

        return (
          <BookingBlock
            key={booking.id}
            booking={booking}
            position={position}
            onClick={onBookingClick}
            onMouseEnter={!isTouchDevice ? onBookingHover : undefined}
            onMouseLeave={!isTouchDevice ? onBookingLeave : undefined}
            onDragStart={!isTouchDevice ? onBookingDragStart : undefined}
            onDragEnd={!isTouchDevice ? onBookingDragEnd : undefined}
            isDragging={!isTouchDevice && (isDraggedBooking?.(booking.id) || false)}
            isSelected={booking.id === selectedBookingId}
            isTouchDevice={isTouchDevice}
          />
        )
      })}
    </div>
  )
})