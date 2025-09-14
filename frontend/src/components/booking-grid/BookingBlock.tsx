import { memo } from "react"
import type { BookingPublic } from "@/client/types.gen"
import { getBookingStatusColor, getBookingHoverColor, getBookingIndicatorColor } from "@/utils/booking-colors"
import { getGuestInitials } from "@/utils/booking-grid"
import { formatDuration } from "@/utils/date-helpers"
import clsx from "clsx"

interface BookingBlockProps {
  booking: BookingPublic
  position: {
    left: string
    width: string
    isPartialStart: boolean
    isPartialEnd: boolean
  }
  onClick: (booking: BookingPublic) => void
  onMouseEnter?: (booking: BookingPublic, event: React.MouseEvent) => void
  onMouseLeave?: () => void
  isDragging?: boolean
  isSelected?: boolean
}

export const BookingBlock = memo(function BookingBlock({
  booking,
  position,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isDragging = false,
  isSelected = false,
}: BookingBlockProps) {
  const guestName = booking.customer?.full_name || "Guest"
  const initials = getGuestInitials(guestName)
  const duration = formatDuration(booking.check_in, booking.check_out)
  const statusColor = getBookingStatusColor(booking.status || "confirmed")
  const hoverColor = getBookingHoverColor(booking.status || "confirmed")
  const indicatorColor = getBookingIndicatorColor(booking.status || "confirmed")

  // Calculate if we should show full name or initials based on width
  const showFullName = parseFloat(position.width) > 10 // Show full name if width > 10%

  return (
    <div
      className={clsx(
        "absolute top-1 bottom-1 rounded-md border cursor-pointer transition-all duration-200",
        "flex items-center gap-1 px-2 py-1 overflow-hidden",
        "shadow-sm hover:shadow-md hover:z-10",
        statusColor,
        hoverColor,
        isDragging && "opacity-50 cursor-grabbing",
        isSelected && "ring-2 ring-primary-500 ring-offset-1"
      )}
      style={{
        left: position.left,
        width: position.width,
        minWidth: "60px",
      }}
      onClick={() => onClick(booking)}
      onMouseEnter={(e) => onMouseEnter?.(booking, e)}
      onMouseLeave={onMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Booking for ${guestName} - ${duration}`}
    >
      {/* Status indicator dot */}
      <div className={clsx("w-2 h-2 rounded-full flex-shrink-0", indicatorColor)} />

      {/* Guest name or initials */}
      <div className="flex-1 min-w-0">
        {showFullName ? (
          <div className="text-xs font-medium truncate">{guestName}</div>
        ) : (
          <div className="text-xs font-bold">{initials}</div>
        )}
      </div>

      {/* Partial indicators */}
      {position.isPartialStart && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30" />
      )}
      {position.isPartialEnd && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30" />
      )}
    </div>
  )
})