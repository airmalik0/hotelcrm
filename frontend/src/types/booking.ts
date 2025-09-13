import type { BookingPublic, BookingStatus } from "@/client/types.gen"

/**
 * Extended booking type with calculated fields for calendar display
 */
export interface BookingWithPosition extends BookingPublic {
  durationHours: number
  leftPercent: number
  widthPercent: number
  rowIndex: number
}

/**
 * Calendar view modes
 */
export type CalendarViewMode = "week" | "month"

/**
 * Booking conflict information
 */
export interface BookingConflict {
  booking: BookingPublic
  type: "overlap" | "too_close"
  message: string
}

/**
 * Get status color classes for booking display
 */
export function getBookingStatusColor(status?: BookingStatus): string {
  const statusColors: Record<BookingStatus, string> = {
    confirmed:
      "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-600/25 dark:border-blue-600/50 dark:text-blue-400",
    checked_in:
      "bg-green-100 border-green-300 text-green-700 dark:bg-green-600/25 dark:border-green-600/50 dark:text-green-400",
    checked_out:
      "bg-neutral-100 border-neutral-300 text-neutral-700 dark:bg-neutral-600/25 dark:border-neutral-600/50 dark:text-neutral-400",
    cancelled:
      "bg-red-100 border-red-300 text-red-700 dark:bg-red-600/25 dark:border-red-600/50 dark:text-red-400",
  }

  return status ? statusColors[status] : statusColors.confirmed
}

/**
 * Calculate booking duration in hours
 */
export function calculateDurationHours(
  checkIn: string | Date,
  checkOut: string | Date,
): number {
  const start = typeof checkIn === "string" ? new Date(checkIn) : checkIn
  const end = typeof checkOut === "string" ? new Date(checkOut) : checkOut
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

/**
 * Calculate booking position as percentage of timeline
 */
export function calculateBookingPosition(
  booking: BookingPublic,
  viewStart: Date,
  viewEnd: Date,
): { leftPercent: number; widthPercent: number } {
  const totalHours =
    (viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60)
  const checkIn = new Date(booking.check_in)
  const checkOut = new Date(booking.check_out)

  // Calculate start position
  let bookingStartOffset =
    (checkIn.getTime() - viewStart.getTime()) / (1000 * 60 * 60)

  // Handle bookings that start before view period
  if (bookingStartOffset < 0) {
    bookingStartOffset = 0
  }

  // Calculate duration within view
  let bookingEndOffset =
    (checkOut.getTime() - viewStart.getTime()) / (1000 * 60 * 60)

  // Handle bookings that end after view period
  if (bookingEndOffset > totalHours) {
    bookingEndOffset = totalHours
  }

  const visibleDuration = bookingEndOffset - bookingStartOffset

  const leftPercent = (bookingStartOffset / totalHours) * 100
  const widthPercent = (visibleDuration / totalHours) * 100

  return {
    leftPercent: Math.max(0, Math.min(100, leftPercent)),
    widthPercent: Math.max(0, Math.min(100 - leftPercent, widthPercent)),
  }
}

/**
 * Check if two bookings overlap
 */
export function doBookingsOverlap(
  booking1: BookingPublic,
  booking2: BookingPublic,
): boolean {
  const start1 = new Date(booking1.check_in)
  const end1 = new Date(booking1.check_out)
  const start2 = new Date(booking2.check_in)
  const end2 = new Date(booking2.check_out)

  return !(end1 <= start2 || start1 >= end2)
}

/**
 * Find conflicts for a booking in a room
 */
export function findBookingConflicts(
  booking: BookingPublic,
  roomBookings: BookingPublic[],
  minGapMinutes = 15,
): BookingConflict[] {
  const conflicts: BookingConflict[] = []
  const checkIn = new Date(booking.check_in)
  const checkOut = new Date(booking.check_out)
  const gapMs = minGapMinutes * 60 * 1000

  for (const existing of roomBookings) {
    if (existing.id === booking.id) continue

    const existingStart = new Date(existing.check_in)
    const existingEnd = new Date(existing.check_out)

    // Check for direct overlap
    if (doBookingsOverlap(booking, existing)) {
      conflicts.push({
        booking: existing,
        type: "overlap",
        message: `Overlaps with booking from ${formatDateTime(existingStart)} to ${formatDateTime(existingEnd)}`,
      })
    }
    // Check if too close (less than minimum gap)
    else if (
      (checkOut > existingStart &&
        checkOut.getTime() + gapMs > existingStart.getTime()) ||
      (checkIn < existingEnd &&
        checkIn.getTime() - gapMs < existingEnd.getTime())
    ) {
      conflicts.push({
        booking: existing,
        type: "too_close",
        message: `Too close to booking (minimum ${minGapMinutes} minutes gap required)`,
      })
    }
  }

  return conflicts
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Format time only for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Get the start of a week (Monday)
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

/**
 * Get the end of a week (Sunday)
 */
export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  return weekEnd
}

/**
 * Get the start of a month
 */
export function getMonthStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the end of a month
 */
export function getMonthEnd(date: Date): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + 1, 0) // Last day of month
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Calculate time from click position on timeline
 */
export function getTimeFromClick(
  clickX: number,
  containerWidth: number,
  viewStart: Date,
  viewEnd: Date,
): Date {
  const percentX = (clickX / containerWidth) * 100
  const totalMs = viewEnd.getTime() - viewStart.getTime()
  const clickMs = (percentX / 100) * totalMs

  const clickTime = new Date(viewStart.getTime() + clickMs)

  // Get the day boundaries
  const dayStart = new Date(clickTime)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  // Calculate position within the day (0 to 1)
  const msIntoDay = clickTime.getTime() - dayStart.getTime()
  const dayDurationMs = 24 * 60 * 60 * 1000
  const positionInDay = msIntoDay / dayDurationMs

  // Set time based on position in day
  // Morning (0-0.5): Set to morning time (10 AM - 2 PM)
  // Afternoon (0.5-1): Set to afternoon time (2 PM - 6 PM)
  let hour = 14 // Default 2 PM
  if (positionInDay < 0.25) {
    hour = 10 // 10 AM for early morning clicks
  } else if (positionInDay < 0.5) {
    hour = 12 // 12 PM for late morning clicks
  } else if (positionInDay < 0.75) {
    hour = 14 // 2 PM for early afternoon clicks
  } else {
    hour = 16 // 4 PM for late afternoon clicks
  }

  const result = new Date(dayStart)
  result.setHours(hour, 0, 0, 0)

  return result
}

/**
 * Get default checkout time (next day at noon)
 */
export function getDefaultCheckoutTime(checkIn: Date): Date {
  const checkOut = new Date(checkIn)
  checkOut.setDate(checkOut.getDate() + 1)
  checkOut.setHours(12, 0, 0, 0)
  return checkOut
}
