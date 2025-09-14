import { memo, useRef } from "react"
import type { RoomPublic, BookingPublic } from "@/client/types.gen"
import { BookingBlock } from "./BookingBlock"
import { getRoomStatusColor, getRoomTypeColor } from "@/utils/booking-colors"
import { calculateBookingPosition, getBookingTimesFromClick } from "@/utils/date-helpers"
import { formatRoomName } from "@/utils/booking-grid"
import clsx from "clsx"
import { Bed, Users, DollarSign } from "lucide-react"

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
}: RoomRowProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const roomName = formatRoomName(room)
  const statusColor = getRoomStatusColor(room.status)
  const typeColor = getRoomTypeColor(room.room_type)

  const handleEmptyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only handle clicks on the container itself, not on bookings
    if (event.target !== event.currentTarget) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const { checkIn, checkOut } = getBookingTimesFromClick(
      clickX,
      rect.width,
      viewStart,
      viewEnd
    )

    onEmptyClick(room, checkIn, checkOut)
  }

  return (
    <div className={clsx(
      "flex border-b border-neutral-200 dark:border-neutral-700 transition-colors",
      isDropTarget && isValidDropTarget && "bg-green-50 dark:bg-green-900/20",
      isDropTarget && !isValidDropTarget && "bg-red-50 dark:bg-red-900/20",
      !isDropTarget && "hover:bg-neutral-50 dark:hover:bg-dark-3"
    )}>
      {/* Room info sidebar - fixed width */}
      <div className="w-48 flex-shrink-0 p-3 border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Room number and type */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {roomName}
              </h3>
              <span className={clsx("text-xs px-2 py-0.5 rounded-full", typeColor)}>
                {room.room_type}
              </span>
            </div>

            {/* Room details */}
            <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-1">
                <Bed className="w-3 h-3" />
                <span>{room.capacity}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>${room.price_per_night}</span>
              </div>
            </div>
          </div>

          {/* Room status indicator */}
          <div className={clsx("text-xs px-2 py-1 rounded", statusColor)}>
            {room.status.replace("_", " ")}
          </div>
        </div>
      </div>

      {/* Booking container - full width, relative positioning */}
      <div
        ref={containerRef}
        className={clsx(
          "flex-1 relative h-16 cursor-pointer room-drop-zone",
          isDropTarget && "transition-colors duration-200"
        )}
        onClick={handleEmptyClick}
        onDragOver={(e) => onRoomDragOver?.(e, room)}
        onDragLeave={onRoomDragLeave}
        onDrop={(e) => onRoomDrop?.(e, room)}
      >
        {/* Render bookings */}
        {bookings.map((booking) => {
          const position = calculateBookingPosition(
            booking.check_in,
            booking.check_out,
            viewStart,
            viewEnd
          )

          // Skip bookings outside the view
          if (parseFloat(position.left) >= 100 || parseFloat(position.left) + parseFloat(position.width) <= 0) {
            return null
          }

          return (
            <BookingBlock
              key={booking.id}
              booking={booking}
              position={position}
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
    </div>
  )
})