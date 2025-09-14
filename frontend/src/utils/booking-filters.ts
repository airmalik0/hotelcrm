import type { BookingPublic, RoomPublic, BookingStatus } from "@/client/types.gen"

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
  filters: BookingFilters
): BookingPublic[] {
  return bookings.filter((booking) => {
    // Search term filter - search across guest name, room number, and booking ID
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      const guestName = booking.customer?.full_name?.toLowerCase() || ""
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
    if (filters.statusFilters.length > 0) {
      if (!filters.statusFilters.includes(booking.status || "confirmed")) {
        return false
      }
    }

    // Room type filter
    if (filters.roomTypeFilters.length > 0) {
      if (!booking.room?.room_type || !filters.roomTypeFilters.includes(booking.room.room_type)) {
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
  roomTypeFilters: string[]
): RoomPublic[] {
  let filtered = rooms

  // Room type filter
  if (roomTypeFilters.length > 0) {
    filtered = filtered.filter(room => roomTypeFilters.includes(room.room_type))
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
  const types = new Set(rooms.map(room => room.room_type))
  return Array.from(types).sort()
}

/**
 * Get search suggestions based on current input
 */
export function getSearchSuggestions(
  searchTerm: string,
  bookings: BookingPublic[]
): Array<{type: 'guest' | 'room' | 'booking', value: string}> {
  if (!searchTerm || searchTerm.length < 2) return []

  const term = searchTerm.toLowerCase()
  const suggestions = new Set<string>()
  const results: Array<{type: 'guest' | 'room' | 'booking', value: string}> = []

  bookings.forEach(booking => {
    // Guest names
    const guestName = booking.customer?.full_name
    if (guestName && guestName.toLowerCase().includes(term) && !suggestions.has(guestName)) {
      suggestions.add(guestName)
      results.push({ type: 'guest', value: guestName })
    }

    // Room numbers
    const roomNumber = booking.room?.room_number
    if (roomNumber && roomNumber.toLowerCase().includes(term) && !suggestions.has(roomNumber)) {
      suggestions.add(roomNumber)
      results.push({ type: 'room', value: roomNumber })
    }

    // Booking IDs (only show if term is at least 3 chars for ID search)
    if (term.length >= 3 && booking.id.toLowerCase().includes(term) && !suggestions.has(booking.id)) {
      suggestions.add(booking.id)
      results.push({ type: 'booking', value: booking.id.slice(0, 8) + "..." })
    }
  })

  return results.slice(0, 8) // Limit suggestions
}

/**
 * Calculate filtered statistics
 */
export function calculateFilteredStats(
  filteredBookings: BookingPublic[],
  filteredRooms: RoomPublic[],
  viewStart: Date,
  viewEnd: Date
) {
  const totalBookings = filteredBookings.length

  // Calculate occupancy rate for filtered data
  const totalRoomDays = filteredRooms.length * Math.ceil(
    (viewEnd.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24)
  )

  let occupiedRoomDays = 0
  filteredBookings.forEach(booking => {
    const bookingStart = Math.max(new Date(booking.check_in).getTime(), viewStart.getTime())
    const bookingEnd = Math.min(new Date(booking.check_out).getTime(), viewEnd.getTime())
    const days = Math.ceil((bookingEnd - bookingStart) / (1000 * 60 * 60 * 24))
    occupiedRoomDays += Math.max(0, days)
  })

  const occupancyRate = totalRoomDays > 0 ? Math.round((occupiedRoomDays / totalRoomDays) * 100) : 0

  return {
    totalBookings,
    occupancyRate,
  }
}