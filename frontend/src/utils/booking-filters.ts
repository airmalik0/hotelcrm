import type {
  BookingPublic,
  BookingStatus,
  RoomPublic,
} from "@/client/types.gen"
import { differenceInDays } from "date-fns"
import { safeParseDate } from "./date-helpers"

export interface BookingFilters {
  searchTerm: string
  statusFilters: BookingStatus[]
  roomTypeFilters: string[]
}

/**
 * Filter bookings based on search criteria
 */
export function filterBookings(
  bookings: BookingPublic[],
  filters: BookingFilters,
): BookingPublic[] {
  return bookings.filter((booking) => {
    // Search term filter - search across guest name, room number, and booking ID
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      const guestName = booking.customer
        ? `${booking.customer.first_name} ${booking.customer.last_name}`.toLowerCase()
        : ""
      const roomNumber = booking.room?.room_number?.toLowerCase() || ""
      const bookingId = booking.id.toLowerCase()

      if (
        !guestName.includes(term) &&
        !roomNumber.includes(term) &&
        !bookingId.includes(term)
      ) {
        return false
      }
    }

    // Status filter
    // If no status filters selected - hide cancelled bookings by default
    // If status filters selected - show only selected statuses
    if (filters.statusFilters.length === 0) {
      // No filters selected - hide cancelled bookings
      if (booking.status === "cancelled") {
        return false
      }
    } else {
      // Status filters selected - show only selected statuses
      if (!filters.statusFilters.includes(booking.status || "confirmed")) {
        return false
      }
    }

    // Room type filter
    if (filters.roomTypeFilters.length > 0) {
      if (
        !booking.room?.room_type ||
        !filters.roomTypeFilters.includes(booking.room.room_type)
      ) {
        return false
      }
    }

    return true
  })
}

/**
 * Filter rooms based on room type filters and whether they have any matching bookings
 */
export function filterRooms(
  rooms: RoomPublic[],
  filteredBookings: BookingPublic[],
  roomTypeFilters: string[],
): RoomPublic[] {
  let filtered = rooms

  // Room type filter
  if (roomTypeFilters.length > 0) {
    filtered = filtered.filter((room) =>
      roomTypeFilters.includes(room.room_type),
    )
  }

  // ALWAYS show all rooms (even without bookings) for:
  // 1. Click to book in empty rooms
  // 2. Drag & drop targets
  // 3. Complete chess-board visualization
  return filtered
}

/**
 * Get unique room types from a list of rooms
 */
export function getUniqueRoomTypes(rooms: RoomPublic[]): string[] {
  const types = new Set(rooms.map((room) => room.room_type))
  return Array.from(types).sort()
}

/**
 * Get search suggestions based on current input
 */
export function getSearchSuggestions(
  searchTerm: string,
  bookings: BookingPublic[],
): Array<{ type: "guest" | "room" | "booking"; value: string }> {
  if (!searchTerm || searchTerm.length < 2) return []

  const term = searchTerm.toLowerCase()
  const suggestions = new Set<string>()
  const results: Array<{ type: "guest" | "room" | "booking"; value: string }> =
    []

  bookings.forEach((booking) => {
    // Guest names
    const guestName = booking.customer
      ? `${booking.customer.first_name} ${booking.customer.last_name}`
      : null
    if (
      guestName?.toLowerCase().includes(term) &&
      !suggestions.has(guestName)
    ) {
      suggestions.add(guestName)
      results.push({ type: "guest", value: guestName })
    }

    // Room numbers
    const roomNumber = booking.room?.room_number
    if (
      roomNumber?.toLowerCase().includes(term) &&
      !suggestions.has(roomNumber)
    ) {
      suggestions.add(roomNumber)
      results.push({ type: "room", value: roomNumber })
    }

    // Booking IDs (only show if term is at least 3 chars for ID search)
    if (
      term.length >= 3 &&
      booking.id.toLowerCase().includes(term) &&
      !suggestions.has(booking.id)
    ) {
      suggestions.add(booking.id)
      results.push({ type: "booking", value: `${booking.id.slice(0, 8)}...` })
    }
  })

  return results.slice(0, 8) // Limit suggestions
}

/**
 * Calculate filtered statistics with PAID occupancy rate
 *
 * Occupancy = Total Paid Nights / Available Room-Nights
 * Can exceed 100% when there are overlapping bookings (overbooking)
 */
export function calculateFilteredStats(
  allBookings: BookingPublic[],
  filteredBookings: BookingPublic[],
  filteredRooms: RoomPublic[],
  viewStart: Date,
  viewEnd: Date,
) {
  const totalBookings = filteredBookings.length

  // Calculate total available room-nights in the period
  const periodDays = Math.max(1, differenceInDays(viewEnd, viewStart))
  const totalAvailableNights = filteredRooms.length * periodDays

  // Calculate total paid nights from bookings
  let totalPaidNights = 0

  // Filter allBookings to only include bookings for filteredRooms
  const filteredRoomIds = new Set(filteredRooms.map((room) => room.id))
  const relevantBookings = allBookings.filter((booking) =>
    filteredRoomIds.has(booking.room_id),
  )

  relevantBookings.forEach((booking) => {
    // Skip cancelled bookings - they don't generate revenue
    if (booking.status === "cancelled") {
      return
    }

    const bookingCheckIn = safeParseDate(booking.check_in)
    const bookingCheckOut = safeParseDate(booking.check_out)

    // Skip bookings completely outside the view period
    if (bookingCheckOut <= viewStart || bookingCheckIn >= viewEnd) {
      return
    }

    // Calculate total paid nights for the booking (minimum 1)
    const totalBookingNights = Math.max(
      1,
      differenceInDays(bookingCheckOut, bookingCheckIn),
    )

    // Calculate intersection with view period
    const effectiveStart =
      bookingCheckIn < viewStart ? viewStart : bookingCheckIn
    const effectiveEnd = bookingCheckOut > viewEnd ? viewEnd : bookingCheckOut

    // Special case: if this is a same-day booking (totalBookingNights = 1)
    // and it overlaps with our view period at all, count it as 1 night
    if (totalBookingNights === 1 && effectiveStart < effectiveEnd) {
      totalPaidNights += 1
    } else {
      // For multi-day bookings, count the actual days in the period
      const daysInPeriod = differenceInDays(effectiveEnd, effectiveStart)
      // But ensure we count at least 1 night if there's any overlap
      const nightsInPeriod =
        daysInPeriod > 0 ? daysInPeriod : effectiveStart < effectiveEnd ? 1 : 0
      totalPaidNights += nightsInPeriod
    }
  })

  // Calculate occupancy rate (can exceed 100% with overbooking)
  const occupancyRate =
    totalAvailableNights > 0
      ? Math.round((totalPaidNights / totalAvailableNights) * 100)
      : 0

  return {
    totalBookings,
    occupancyRate,
  }
}
