import {
  addDays,
  addHours,
  differenceInHours,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"

export type ViewMode = "week" | "month"

/**
 * Get the start and end dates for the current view
 * Week mode shows full week, Month mode shows full month
 */
export function getViewDateRange(date: Date, view: ViewMode) {
  if (view === "week") {
    // Show full week (Monday to Sunday)
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
      end: endOfWeek(date, { weekStartsOn: 1 }),
    }
  }
  // Show full month
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

/**
 * Get total hours in the current view
 */
export function getViewTotalHours(viewStart: Date, viewEnd: Date): number {
  // differenceInHours gives us the exact hours between dates
  // For a week view: Sunday 23:59 - Monday 00:00 = ~168 hours
  return differenceInHours(viewEnd, viewStart)
}

/**
 * Calculate booking position as percentage
 */
export function calculateBookingPosition(
  checkIn: string | Date,
  checkOut: string | Date,
  viewStart: Date,
  viewEnd: Date,
) {
  const bookingStart = new Date(checkIn)
  const bookingEnd = new Date(checkOut)
  const viewStartTime = viewStart.getTime()
  const viewEndTime = viewEnd.getTime()
  const totalMs = viewEndTime - viewStartTime

  // Skip bookings completely outside the view
  if (
    bookingEnd.getTime() <= viewStartTime ||
    bookingStart.getTime() >= viewEndTime
  ) {
    return null
  }

  // Calculate left position
  const startMs =
    Math.max(bookingStart.getTime(), viewStartTime) - viewStartTime
  const left = (startMs / totalMs) * 100

  // Calculate width
  const endMs = Math.min(bookingEnd.getTime(), viewEndTime) - viewStartTime
  const width = ((endMs - startMs) / totalMs) * 100

  return {
    left: `${left}%`,
    width: `${width}%`,
    isPartialStart: bookingStart < viewStart,
    isPartialEnd: bookingEnd > viewEnd,
  }
}

/**
 * Generate time scale markers with responsive formatting
 */
export function generateTimeScale(
  viewStart: Date,
  viewEnd: Date,
  view: ViewMode,
  containerWidth?: number,
) {
  const markers = []
  const totalMs = viewEnd.getTime() - viewStart.getTime()

  // For both week and month views, generate daily markers
  let currentDate = startOfDay(viewStart)
  const endDate = startOfDay(viewEnd)

  // Determine format based on view mode and container width
  let formatStr: string
  if (view === "week") {
    formatStr = "EEE" // Just day name (Mon, Tue, Wed, etc.)
  } else {
    // Month view - adjust label format based on container width
    if (!containerWidth || containerWidth > 1600) {
      formatStr = "dd MMM" // Full format for very large screens
    } else {
      formatStr = "dd" // Just day number for smaller screens
    }
  }

  // Generate one marker per day
  while (currentDate <= endDate) {
    const positionMs = currentDate.getTime() - viewStart.getTime()
    const position = (positionMs / totalMs) * 100

    markers.push({
      position: `${position}%`,
      label: format(currentDate, formatStr),
      date: currentDate,
      isToday: isSameDay(currentDate, new Date()),
    })

    currentDate = addDays(currentDate, 1)
  }

  return markers
}

/**
 * Calculate booking times from click position
 */
export function getBookingTimesFromClick(
  clickX: number,
  containerWidth: number,
  viewStart: Date,
  viewEnd: Date,
) {
  const percentage = clickX / containerWidth
  const totalHours = getViewTotalHours(viewStart, viewEnd)
  const clickHours = percentage * totalHours

  // Round to nearest hour
  const checkIn = addHours(viewStart, Math.floor(clickHours))

  // Default checkout: next day at 12:00
  const checkOut = setHours(setMinutes(addDays(checkIn, 1), 0), 12)

  return { checkIn, checkOut }
}

/**
 * Check if two bookings overlap
 */
export function bookingsOverlap(
  booking1: { check_in: string | Date; check_out: string | Date },
  booking2: { check_in: string | Date; check_out: string | Date },
): boolean {
  const start1 = new Date(booking1.check_in)
  const end1 = new Date(booking1.check_out)
  const start2 = new Date(booking2.check_in)
  const end2 = new Date(booking2.check_out)

  return start1 < end2 && start2 < end1
}

/**
 * Check if a booking is visible in current view
 */
export function isBookingInView(
  checkIn: string | Date,
  checkOut: string | Date,
  viewStart: Date,
  viewEnd: Date,
): boolean {
  const bookingStart = new Date(checkIn)
  const bookingEnd = new Date(checkOut)

  return bookingStart < viewEnd && bookingEnd > viewStart
}

/**
 * Format duration for display
 */
export function formatDuration(
  checkIn: string | Date,
  checkOut: string | Date,
): string {
  const hours = differenceInHours(new Date(checkOut), new Date(checkIn))
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (days === 0) {
    return `${hours}h`
  }
  if (remainingHours === 0) {
    return `${days}d`
  }
  return `${days}d ${remainingHours}h`
}

/**
 * Get current time position as percentage
 */
export function getCurrentTimePosition(
  viewStart: Date,
  viewEnd: Date,
): string | null {
  const now = new Date()

  if (now < viewStart || now > viewEnd) {
    return null
  }

  const totalMs = viewEnd.getTime() - viewStart.getTime()
  const currentMs = now.getTime() - viewStart.getTime()
  const percentage = (currentMs / totalMs) * 100

  return `${percentage}%`
}
