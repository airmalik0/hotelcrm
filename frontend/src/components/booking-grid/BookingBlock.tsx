import type { BookingPublic } from "@/client/types.gen"
import {
  getBookingHoverColor,
  getBookingIndicatorColor,
  getBookingStatusColor,
} from "@/utils/booking-colors"
import { getGuestInitials } from "@/utils/booking-grid"
import { formatDuration } from "@/utils/date-helpers"
import clsx from "clsx"
import { memo } from "react"

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
  onDragStart?: (e: React.DragEvent, booking: BookingPublic) => void
  onDragEnd?: (e: React.DragEvent) => void
  isDragging?: boolean
  isSelected?: boolean
  isDraggable?: boolean
  isTouchDevice?: boolean
}

export const BookingBlock = memo(function BookingBlock({
  booking,
  position,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
  isDragging = false,
  isSelected = false,
  isDraggable = true,
  isTouchDevice = false,
}: BookingBlockProps) {
  const guestName = booking.customer
    ? `${booking.customer.first_name} ${booking.customer.last_name}`
    : "Guest"
  const initials = getGuestInitials(guestName)
  const duration = formatDuration(booking.check_in, booking.check_out)
  const statusColor = getBookingStatusColor(booking.status || "confirmed")
  const hoverColor = getBookingHoverColor(booking.status || "confirmed")
  const indicatorColor = getBookingIndicatorColor(booking.status || "confirmed")

  // Calculate if we should show full name or initials based on width
  const widthPercent = Number.parseFloat(position.width)
  const showFullName = widthPercent > 10 // Show full name if width > 10%
  const showInitials = widthPercent > 1.5 // Show initials if width > 1.5%
  const showStatusDot = widthPercent > 0.8 // Show status dot if width > 0.8%

  // Adaptive padding based on width
  const paddingClass =
    widthPercent < 2 ? "px-0.5" : widthPercent < 5 ? "px-1" : "px-2"

  // Only allow dragging for confirmed bookings (not checked in/out) and not on touch devices
  const canDrag =
    isDraggable && booking.status === "confirmed" && !isTouchDevice

  return (
    <div
      className={clsx(
        "absolute rounded-md border transition-all duration-200",
        // Better touch targets with CSS
        "top-1 bottom-1 md:top-1 md:bottom-1",
        // Mobile-first touch targets
        "touch-manipulation min-h-[44px] md:min-h-0",
        `flex items-center gap-1 ${paddingClass} overflow-hidden box-border`,
        "py-2 md:py-1",
        "shadow-sm hover:shadow-md hover:z-10",
        statusColor,
        hoverColor,
        canDrag && "cursor-move",
        !canDrag && "cursor-pointer",
        isDragging && "opacity-50 cursor-grabbing",
        isSelected && "ring-2 ring-primary-500 ring-offset-1",
      )}
      style={{
        left: position.left,
        width: position.width,
        zIndex: isSelected ? 20 : isDragging ? 5 : 1,
      }}
      draggable={canDrag}
      onDragStart={(e) => canDrag && onDragStart?.(e, booking)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(booking)}
      onMouseEnter={(e) => onMouseEnter?.(booking, e)}
      onMouseLeave={onMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`Booking for ${guestName} - ${duration}`}
    >
      {/* Status indicator dot - only show if there's enough space */}
      {showStatusDot && (
        <div
          className={clsx("w-2 h-2 rounded-full flex-shrink-0", indicatorColor)}
        />
      )}

      {/* Guest name or initials - only show if there's enough space */}
      {showInitials && (
        <div className="flex-1 min-w-0">
          {showFullName ? (
            <div className="text-xs font-medium truncate">{guestName}</div>
          ) : (
            <div className="text-xs font-bold">{initials}</div>
          )}
        </div>
      )}

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
