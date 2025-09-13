import type { BookingPublic, RoomPublic } from "@/client/types.gen"
import type { BookingWithPosition, CalendarViewMode } from "@/types/booking"
import { calculateBookingPosition, calculateDurationHours } from "@/types/booking"

/**
 * Generate time scale markers for the calendar
 */
export interface TimeMarker {
  position: number // Percentage position
  label: string
  date: Date
}

export function generateTimeScale(
  viewMode: CalendarViewMode,
  startDate: Date
): TimeMarker[] {
  const markers: TimeMarker[] = []

  if (viewMode === "week") {
    // For week view: show every 6 hours
    const totalHours = 168 // 7 days × 24 hours
    const interval = 6

    for (let hour = 0; hour <= totalHours; hour += interval) {
      const markerDate = new Date(startDate.getTime() + hour * 60 * 60 * 1000)
      const position = (hour / totalHours) * 100

      markers.push({
        position,
        label: formatTimeLabel(markerDate, hour % 24 === 0),
        date: markerDate
      })
    }
  } else {
    // For month view: show every day at noon
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const totalHours = totalDays * 24

    for (let day = 0; day <= totalDays; day++) {
      const markerDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000)
      markerDate.setHours(12, 0, 0, 0)
      const hour = day * 24 + 12
      const position = (hour / totalHours) * 100

      markers.push({
        position,
        label: formatMonthLabel(markerDate),
        date: markerDate
      })
    }
  }

  return markers
}

/**
 * Format time label for week view
 */
function formatTimeLabel(date: Date, showDay: boolean): string {
  if (showDay) {
    // Show day and date for midnight markers
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    })
  }
  // Show just time for other markers
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true
  })
}

/**
 * Format time label for month view
 */
function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })
}

/**
 * Process bookings for calendar display
 */
export function processBookingsForCalendar(
  bookings: BookingPublic[],
  rooms: RoomPublic[],
  viewStart: Date,
  viewEnd: Date
): BookingWithPosition[] {
  const roomIndexMap = new Map(rooms.map((room, index) => [room.id, index]))

  return bookings
    .filter(booking => {
      // Filter bookings that are visible in the current view
      const checkIn = new Date(booking.check_in)
      const checkOut = new Date(booking.check_out)
      return checkOut > viewStart && checkIn < viewEnd
    })
    .map(booking => {
      const position = calculateBookingPosition(booking, viewStart, viewEnd)
      const durationHours = calculateDurationHours(booking.check_in, booking.check_out)
      const rowIndex = roomIndexMap.get(booking.room_id) ?? 0

      return {
        ...booking,
        durationHours,
        leftPercent: position.leftPercent,
        widthPercent: position.widthPercent,
        rowIndex
      }
    })
    .sort((a, b) => {
      // Sort by row index, then by start time
      if (a.rowIndex !== b.rowIndex) {
        return a.rowIndex - b.rowIndex
      }
      return new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    })
}

/**
 * Group bookings by room for easier rendering
 */
export function groupBookingsByRoom(
  bookings: BookingWithPosition[]
): Map<string, BookingWithPosition[]> {
  const grouped = new Map<string, BookingWithPosition[]>()

  for (const booking of bookings) {
    const roomId = booking.room_id
    if (!grouped.has(roomId)) {
      grouped.set(roomId, [])
    }
    grouped.get(roomId)!.push(booking)
  }

  return grouped
}

/**
 * Calculate optimal row height based on content
 */
export function calculateRowHeight(bookingsInRow: BookingWithPosition[]): number {
  const baseHeight = 60 // Base height in pixels
  const maxOverlaps = calculateMaxOverlaps(bookingsInRow)
  return Math.max(baseHeight, baseHeight * Math.ceil(maxOverlaps / 2))
}

/**
 * Calculate maximum number of overlapping bookings
 */
function calculateMaxOverlaps(bookings: BookingWithPosition[]): number {
  if (bookings.length === 0) return 0

  const events: { time: number; type: "start" | "end" }[] = []

  for (const booking of bookings) {
    events.push({ time: new Date(booking.check_in).getTime(), type: "start" })
    events.push({ time: new Date(booking.check_out).getTime(), type: "end" })
  }

  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time
    // If times are equal, process "end" before "start"
    return a.type === "end" ? -1 : 1
  })

  let maxOverlaps = 0
  let currentOverlaps = 0

  for (const event of events) {
    if (event.type === "start") {
      currentOverlaps++
      maxOverlaps = Math.max(maxOverlaps, currentOverlaps)
    } else {
      currentOverlaps--
    }
  }

  return maxOverlaps
}

/**
 * Get calendar period label
 */
export function getCalendarPeriodLabel(
  viewMode: CalendarViewMode,
  currentDate: Date
): string {
  if (viewMode === "week") {
    const weekStart = new Date(currentDate)
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
    weekStart.setDate(diff)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const startMonth = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

    return `${startMonth} - ${endMonth}`
  } else {
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }
}

/**
 * Navigate to previous/next period
 */
export function navigatePeriod(
  currentDate: Date,
  viewMode: CalendarViewMode,
  direction: "prev" | "next"
): Date {
  const newDate = new Date(currentDate)

  if (viewMode === "week") {
    const days = direction === "prev" ? -7 : 7
    newDate.setDate(newDate.getDate() + days)
  } else {
    const months = direction === "prev" ? -1 : 1
    newDate.setMonth(newDate.getMonth() + months)
  }

  return newDate
}