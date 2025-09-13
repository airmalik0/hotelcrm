import type { BookingPublic } from "@/client/types.gen"
import type { BookingWithPosition } from "@/types/booking"
import { formatTime, getBookingStatusColor } from "@/types/booking"
import { Clock, User } from "lucide-react"
import type React from "react"
import { useState } from "react"

interface BookingBlockProps {
  booking: BookingWithPosition
  onClick: (booking: BookingPublic) => void
  canEdit: boolean
}

export function BookingBlock({ booking, onClick, canEdit }: BookingBlockProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the empty slot click
    onClick(booking)
  }

  const checkIn = new Date(booking.check_in)
  const checkOut = new Date(booking.check_out)

  // Calculate if booking is narrow (less than 3% width)
  const isNarrow = booking.widthPercent < 3

  // Get status-based styling
  const statusColor = getBookingStatusColor(booking.status)

  return (
    <>
      <div
        className={`
          absolute top-1 bottom-1 rounded-md border-2
          transition-all duration-200 cursor-pointer z-10
          ${statusColor}
          ${isHovered ? "shadow-lg scale-105 z-20" : "shadow-sm"}
          ${canEdit ? "hover:shadow-lg hover:scale-105" : ""}
          ${isNarrow ? "min-w-[40px]" : ""}
        `}
        style={{
          left: `${booking.leftPercent}%`,
          width: isNarrow ? "40px" : `${booking.widthPercent}%`
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={`
          ${booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : "Unknown Customer"}
          ${formatTime(checkIn)} - ${formatTime(checkOut)}
          Status: ${booking.status}
          ${booking.room?.room_number ? `Room: ${booking.room.room_number}` : ""}
        `.trim()}
      >
        {/* Content */}
        <div className="p-1.5 h-full flex flex-col justify-center overflow-hidden">
          {/* Customer Name */}
          <div className="flex items-center gap-1 mb-0.5">
            <User className="w-3 h-3 flex-shrink-0 opacity-70" />
            <span className="text-xs font-semibold truncate">
              {booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : "Unknown"}
            </span>
          </div>

          {/* Time */}
          {!isNarrow && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0 opacity-70" />
              <span className="text-xs opacity-90">
                {formatTime(checkIn)} - {formatTime(checkOut)}
              </span>
            </div>
          )}
        </div>

        {/* Status indicator dot */}
        <div
          className={`
            absolute top-1 right-1 w-2 h-2 rounded-full
            ${booking.status === "confirmed" ? "bg-blue-500" : ""}
            ${booking.status === "checked_in" ? "bg-green-500" : ""}
            ${booking.status === "checked_out" ? "bg-neutral-500" : ""}
            ${booking.status === "cancelled" ? "bg-red-500" : ""}
          `}
        />
      </div>

      {/* Tooltip for narrow bookings */}
      {isHovered && isNarrow && (
        <div className="absolute z-30 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none max-w-xs"
             style={{
               left: `${booking.leftPercent}%`,
               top: "-60px",
               transform: "translateX(-50%)"
             }}>
          <div className="font-semibold mb-1">
            {booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : "Unknown Customer"}
          </div>
          <div className="mb-1">
            {formatTime(checkIn)} - {formatTime(checkOut)}
          </div>
          <div className="text-xs opacity-80">
            Status: {booking.status}
          </div>
          <div className="text-xs opacity-80">
            Duration: {booking.durationHours.toFixed(1)}h
          </div>
          {booking.room?.room_number && (
            <div className="text-xs opacity-80">
              Room: {booking.room.room_number}
            </div>
          )}

          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100" />
        </div>
      )}
    </>
  )
}