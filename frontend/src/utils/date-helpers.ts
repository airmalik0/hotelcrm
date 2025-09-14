import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addHours,
  differenceInHours,
  format,
  isSameDay,
  setHours,
  setMinutes,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns"

export type ViewMode = "week" | "month"

/**
 * Get the start and end dates for the current view
 */
export function getViewDateRange(date: Date, view: ViewMode) {
  if (view === "week") {
    return {
      start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
      end: endOfWeek(date, { weekStartsOn: 1 }),
    }
  }
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
  viewEnd: Date
) {
  const bookingStart = new Date(checkIn)
  const bookingEnd = new Date(checkOut)
  const viewStartTime = viewStart.getTime()
  const viewEndTime = viewEnd.getTime()
  const totalMs = viewEndTime - viewStartTime

  // Calculate left position
  const startMs = Math.max(bookingStart.getTime(), viewStartTime) - viewStartTime
  const left = (startMs / totalMs) * 100

  // Calculate width
  const endMs = Math.min(bookingEnd.getTime(), viewEndTime) - viewStartTime
  const width = Math.max(((endMs - startMs) / totalMs) * 100, 2) // Min 2% width

  return {
    left: `${left}%`,
    width: `${width}%`,
    isPartialStart: bookingStart < viewStart,
    isPartialEnd: bookingEnd > viewEnd,
  }
}

/**
 * Generate time scale markers
 */
export function generateTimeScale(viewStart: Date, viewEnd: Date, view: ViewMode) {
  const markers = []
  const totalHours = getViewTotalHours(viewStart, viewEnd)
  const interval = view === "week" ? 6 : 24 // Every 6h for week, 24h for month

  for (let hour = 0; hour <= totalHours; hour += interval) {
    const markerDate = addHours(viewStart, hour)
    const position = (hour / totalHours) * 100

    markers.push({
      position: `${position}%`,
      label: view === "week"
        ? format(markerDate, "EEE HH:mm") // Always show day for clarity
        : format(markerDate, "dd MMM"),
      date: markerDate,
      isToday: isSameDay(markerDate, new Date()),
    })
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
  viewEnd: Date
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
  booking2: { check_in: string | Date; check_out: string | Date }
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
  viewEnd: Date
): boolean {
  const bookingStart = new Date(checkIn)
  const bookingEnd = new Date(checkOut)

  return bookingStart < viewEnd && bookingEnd > viewStart
}

/**
 * Format duration for display
 */
export function formatDuration(checkIn: string | Date, checkOut: string | Date): string {
  const hours = differenceInHours(new Date(checkOut), new Date(checkIn))
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (days === 0) {
    return `${hours}h`
  } else if (remainingHours === 0) {
    return `${days}d`
  } else {
    return `${days}d ${remainingHours}h`
  }
}

/**
 * Get current time position as percentage
 */
export function getCurrentTimePosition(viewStart: Date, viewEnd: Date): string | null {
  const now = new Date()

  if (now < viewStart || now > viewEnd) {
    return null
  }

  const totalMs = viewEnd.getTime() - viewStart.getTime()
  const currentMs = now.getTime() - viewStart.getTime()
  const percentage = (currentMs / totalMs) * 100

  return `${percentage}%`
}