import {
  addDays,
  addHours,
  differenceInHours,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isValid,
  isWithinInterval,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"

/**
 * Safe date parsing utilities to prevent app crashes from invalid dates
 */
export function safeParseDate(input: string | Date | number): Date {
  try {
    const date = new Date(input)
    if (!isValid(date)) {
      throw new Error(`Invalid date: ${input}`)
    }
    return date
  } catch (error) {
    throw new Error(
      `Failed to parse date: ${input}. ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function safeParseDateOrNull(
  input: string | Date | number,
): Date | null {
  try {
    return safeParseDate(input)
  } catch {
    return null
  }
}

export function isValidDateInput(input: string | Date | number): boolean {
  try {
    const date = new Date(input)
    return isValid(date)
  } catch {
    return false
  }
}

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
  const bookingStart = safeParseDate(checkIn)
  const bookingEnd = safeParseDate(checkOut)
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
 * Generate time scale markers - one vertical line per day
 * Best practice: Simple, predictable, handles DST correctly
 */
export function generateTimeScale(
  viewStart: Date,
  viewEnd: Date,
  view: ViewMode,
  containerWidth?: number,
) {
  const markers = []

  // Total time span for percentage calculations
  const totalMs = viewEnd.getTime() - viewStart.getTime()

  // Start at midnight of the first day (viewStart is already at 00:00:00)
  let currentDate = new Date(viewStart)

  // Determine label format
  const formatStr =
    view === "week"
      ? "EEE" // Week view: day names (Mon, Tue, Wed)
      : containerWidth && containerWidth <= 1600
        ? "dd" // Month view small: day numbers (01, 02, 03)
        : "dd MMM" // Month view large: day + month (01 Jan)

  // Generate one marker per day at midnight
  // Continue while we're still within the view (viewEnd is at 23:59:59)
  while (currentDate <= viewEnd) {
    // Calculate position as percentage from start
    const offsetMs = currentDate.getTime() - viewStart.getTime()
    const positionPercent = (offsetMs / totalMs) * 100

    markers.push({
      position: `${positionPercent}%`,
      label: format(currentDate, formatStr),
      date: new Date(currentDate), // Clone to avoid mutations
      isToday: isSameDay(currentDate, new Date()),
    })

    // Move to next day at midnight
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
  const start1 = safeParseDate(booking1.check_in)
  const end1 = safeParseDate(booking1.check_out)
  const start2 = safeParseDate(booking2.check_in)
  const end2 = safeParseDate(booking2.check_out)

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
  const bookingStart = safeParseDate(checkIn)
  const bookingEnd = safeParseDate(checkOut)

  return bookingStart < viewEnd && bookingEnd > viewStart
}

/**
 * Format duration for display
 */
export function formatDuration(
  checkIn: string | Date,
  checkOut: string | Date,
): string {
  const hours = differenceInHours(
    safeParseDate(checkOut),
    safeParseDate(checkIn),
  )
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
