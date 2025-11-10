import type { BookingPublic } from "@/client/types.gen"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  getBookingHoverColor,
  getBookingIndicatorColor,
  getBookingStatusColor,
} from "@/utils/booking-colors"
import { getGuestInitials } from "@/utils/booking-grid"
import { formatDuration } from "@/utils/date-helpers"
import {
  getBestFittingName,
  getMinimumReadableWidth,
} from "@/utils/text-fitting"
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
  realWidthPx?: number
  onClick: (booking: BookingPublic) => void
  onMouseEnter?: (booking: BookingPublic, event: React.MouseEvent) => void
  onMouseLeave?: () => void
  onDragStart?: (e: React.DragEvent, booking: BookingPublic) => void
  onDragEnd?: (e: React.DragEvent) => void
  isDragging?: boolean
  isSelected?: boolean
  isDraggable?: boolean
  isTouchDevice?: boolean
  fontSize?: number
}

export const BookingBlock = memo(function BookingBlock({
  booking,
  position,
  realWidthPx,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDragEnd,
  isDragging = false,
  isSelected = false,
  isDraggable = true,
  isTouchDevice = false,
  fontSize = 12,
}: BookingBlockProps) {
  const { t } = useLanguage()
  const guestName = booking.customer
    ? `${booking.customer.first_name} ${booking.customer.last_name}`
    : t.booking.guest
  const duration = formatDuration(booking.check_in, booking.check_out)

  // Memoize status to avoid repetition
  const bookingStatus = booking.status || "confirmed"
  const statusColor = getBookingStatusColor(bookingStatus)
  const hoverColor = getBookingHoverColor(bookingStatus)
  const indicatorColor = getBookingIndicatorColor(bookingStatus)

  // Smart text fitting - use real pixel width if available, fallback to percentage logic
  let displayText = ""
  let showStatusDot = false
  let paddingClass = "px-2"

  if (realWidthPx !== undefined) {
    // New smart logic using real pixel measurements
    const minimumReadableWidth = getMinimumReadableWidth(fontSize)
    showStatusDot = realWidthPx > 16 // Show dot if width > 16px

    if (realWidthPx >= minimumReadableWidth) {
      displayText = getBestFittingName(guestName, realWidthPx, fontSize, 16) // 16px padding for dot + margins
    }

    // Adaptive padding based on real width
    paddingClass =
      realWidthPx < 30 ? "px-0.5" : realWidthPx < 80 ? "px-1" : "px-2"
  } else {
    // Fallback to old percentage logic for compatibility
    const widthPercent = Number.parseFloat(position.width)
    showStatusDot = widthPercent > 0.8

    if (widthPercent > 3) {
      displayText = guestName
    } else if (widthPercent > 1.5) {
      displayText = getGuestInitials(guestName)
    }

    paddingClass =
      widthPercent < 2 ? "px-0.5" : widthPercent < 5 ? "px-1" : "px-2"
  }

  // Only allow dragging for confirmed bookings (not checked in/out) and not on touch devices
  const canDrag = isDraggable && bookingStatus === "confirmed" && !isTouchDevice

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
        canDrag && "cursor-move draggable",
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

      {/* Guest name - dynamically fitted to available space */}
      {displayText && (
        <div className="flex-1 min-w-0">
          <div className="font-medium" style={{ fontSize: `${fontSize}px` }}>
            {displayText}
          </div>
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
