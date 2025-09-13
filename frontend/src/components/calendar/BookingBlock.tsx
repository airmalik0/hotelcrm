import type { BookingPublic } from "@/client/types.gen"
import type { BookingWithPosition } from "@/types/booking"
import { formatTime, getBookingStatusColor } from "@/types/booking"
import { Clock, User } from "lucide-react"
import React, { useState } from "react"

interface BookingBlockProps {
  booking: BookingWithPosition
  onClick: (booking: BookingPublic) => void
  canEdit: boolean
}

export function BookingBlock({ booking, onClick, canEdit }: BookingBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the empty slot click
    // Left click opens detail modal
    if (e.button === 0) {
      onClick(booking)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault() // Prevent browser context menu
    e.stopPropagation()
    setShowTooltip(!showTooltip) // Toggle tooltip on right-click
  }

  // Close tooltip when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = () => setShowTooltip(false)
    if (showTooltip) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showTooltip])

  const checkIn = new Date(booking.check_in)
  const checkOut = new Date(booking.check_out)

  // Calculate booking width categories
  const isVeryNarrow = booking.widthPercent < 2 // Just icon
  const isNarrow = booking.widthPercent < 5 // Icon + initial
  const isMedium = booking.widthPercent < 10 // Short name
  const isWide = booking.widthPercent >= 10 // Full content

  // Get status-based styling
  const statusColor = getBookingStatusColor(booking.status)

  // Get customer display name
  const customerName = booking.customer
    ? `${booking.customer.first_name} ${booking.customer.last_name}`
    : "Unknown"
  const customerInitial = booking.customer?.first_name?.[0] || "?"

  return (
    <>
      <div
        className={`
          absolute top-1.5 bottom-1.5 rounded-lg
          transition-all duration-200 cursor-pointer z-10
          ${statusColor}
          ${showTooltip ? "shadow-xl scale-[1.02] z-20 ring-2 ring-primary-400/50" : "shadow-md"}
          ${canEdit ? "hover:shadow-lg" : ""}
        `}
        style={{
          left: `${booking.leftPercent}%`,
          width: `${Math.max(booking.widthPercent, 1.5)}%`,
          minWidth: isVeryNarrow ? "24px" : isNarrow ? "48px" : "72px",
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Content based on width */}
        <div className="h-full flex items-center px-1.5 overflow-hidden">
          {isVeryNarrow ? (
            // Very narrow: Just icon or initial
            <div className="w-full flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs font-bold">{customerInitial}</span>
              </div>
            </div>
          ) : isNarrow ? (
            // Narrow: Icon + initial
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-bold">{customerInitial}</span>
            </div>
          ) : isMedium ? (
            // Medium: Short name
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-semibold truncate">
                {booking.customer?.first_name || "Unknown"}
              </span>
            </div>
          ) : (
            // Wide: Full content
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-xs font-semibold truncate">
                  {customerName}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 flex-shrink-0 opacity-75" />
                <span className="text-[10px] opacity-90">
                  {formatTime(checkIn)} - {formatTime(checkOut)}
                </span>
              </div>
            </div>
          )}

          {/* Status dot for wider bookings */}
          {!isVeryNarrow && (
            <div
              className={`
                ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0
                ${booking.status === "confirmed" ? "bg-blue-500" : ""}
                ${booking.status === "checked_in" ? "bg-green-500" : ""}
                ${booking.status === "checked_out" ? "bg-neutral-500" : ""}
                ${booking.status === "cancelled" ? "bg-red-500" : ""}
              `}
            />
          )}
        </div>
      </div>

      {/* Enhanced tooltip on right-click */}
      {showTooltip && (
        <div
          className="absolute z-40 bg-white dark:bg-dark-2 text-neutral-900 dark:text-white rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-600 pointer-events-none"
          style={{
            left: `${Math.min(booking.leftPercent + booking.widthPercent / 2, 85)}%`,
            top: "60px", // Always show below the booking
            zIndex: 50,
            transform: "translateX(-50%)",
            minWidth: "200px",
          }}
        >
          <div className="px-3 py-2">
            {/* Customer name */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-600/25 flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">{customerName}</div>
                {booking.customer?.phone && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {booking.customer.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Time info */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                <span>
                  {formatTime(checkIn)} - {formatTime(checkOut)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Duration:</span>
                <span>{booking.durationHours.toFixed(1)} hours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Status:</span>
                <span
                  className={`
                  px-2 py-0.5 rounded-full text-xs font-medium
                  ${booking.status === "confirmed" ? "bg-blue-100 text-blue-700 dark:bg-blue-600/25 dark:text-blue-400" : ""}
                  ${booking.status === "checked_in" ? "bg-green-100 text-green-700 dark:bg-green-600/25 dark:text-green-400" : ""}
                  ${booking.status === "checked_out" ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-600/25 dark:text-neutral-400" : ""}
                  ${booking.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-600/25 dark:text-red-400" : ""}
                `}
                >
                  {booking.status}
                </span>
              </div>
              {booking.total_amount && (
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Amount:</span>
                  <span className="font-semibold">${booking.total_amount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Arrow pointing up */}
          <div
            className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0
              border-l-[6px] border-r-[6px] border-b-[6px]
              border-transparent border-b-white dark:border-b-dark-2"
          />
        </div>
      )}
    </>
  )
}
