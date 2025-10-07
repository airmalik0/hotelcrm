import type { BookingPublic, RoomPublic } from "@/client/types.gen"
import { differenceInDays } from "date-fns"
import { bookingsOverlap, isBookingInView, safeParseDate } from "./date-helpers"

export interface BookingWithLane extends BookingPublic {
  lane: number
}

/**
 * Calculate vertical lanes for overlapping bookings to prevent visual overlap
 * Used in month view to stack bookings that would otherwise overlap
 */
export function assignBookingLanes(
  bookings: BookingPublic[],
  viewStart: Date,
  viewEnd: Date,
): BookingWithLane[] {
  if (!bookings.length) return []

  // Sort by check-in date
  const sortedBookings = [...bookings].sort(
    (a, b) =>
      safeParseDate(a.check_in).getTime() - safeParseDate(b.check_in).getTime(),
  )

  const bookingsWithLanes: BookingWithLane[] = []
  const lanes: Array<{ endTime: number }> = []

  for (const booking of sortedBookings) {
    const startTime = safeParseDate(booking.check_in).getTime()
    const endTime = safeParseDate(booking.check_out).getTime()

    // Find the first available lane
    let assignedLane = -1
    for (let i = 0; i < lanes.length; i++) {
      // Add buffer of 2 hours to prevent visual overlap
      if (lanes[i].endTime + 2 * 60 * 60 * 1000 <= startTime) {
        assignedLane = i
        lanes[i].endTime = endTime
        break
      }
    }

    // If no lane is available, create a new one
    if (assignedLane === -1) {
      assignedLane = lanes.length
      lanes.push({ endTime })
    }

    bookingsWithLanes.push({
      ...booking,
      lane: assignedLane,
    })
  }

  return bookingsWithLanes
}

/**
 * Group bookings by room ID
 */
export function groupBookingsByRoom(
  bookings: BookingPublic[],
): Map<string, BookingPublic[]> {
  const grouped = new Map<string, BookingPublic[]>()

  for (const booking of bookings) {
    const roomBookings = grouped.get(booking.room_id) || []
    roomBookings.push(booking)
    grouped.set(booking.room_id, roomBookings)
  }

  // Sort bookings within each room by check-in time
  for (const [roomId, roomBookings] of grouped) {
    roomBookings.sort(
      (a, b) =>
        safeParseDate(a.check_in).getTime() -
        safeParseDate(b.check_in).getTime(),
    )
  }

  return grouped
}

/**
 * Check if a room is available for a time period
 * Uses actual_check_out if the booking has already been checked out
 */
export function isRoomAvailable(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  existingBookings: BookingPublic[],
  excludeBookingId?: string,
): boolean {
  const roomBookings = existingBookings.filter(
    (b) => b.room_id === roomId && b.id !== excludeBookingId,
  )

  for (const booking of roomBookings) {
    // If booking has been cancelled, skip it
    if (booking.status === "cancelled") {
      continue
    }

    // Use actual check-out if available (early checkout frees room earlier)
    // BUT always use planned check-in (room is blocked from planned time regardless of actual arrival)
    const effectiveCheckOut = booking.actual_check_out || booking.check_out

    if (
      bookingsOverlap(
        { check_in: checkIn, check_out: checkOut },
        { check_in: booking.check_in, check_out: effectiveCheckOut },
      )
    ) {
      return false
    }
  }

  return true
}

/**
 * Get available rooms for a time period
 */
export function getAvailableRooms(
  rooms: RoomPublic[],
  checkIn: Date,
  checkOut: Date,
  bookings: BookingPublic[],
  excludeBookingId?: string,
): RoomPublic[] {
  return rooms.filter((room) =>
    isRoomAvailable(room.id, checkIn, checkOut, bookings, excludeBookingId),
  )
}

/**
 * Get guest initials from full name
 */
export function getGuestInitials(fullName: string | undefined | null): string {
  if (!fullName) return "?"

  const names = fullName.trim().split(" ")
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase()
  }

  return names
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

/**
 * Format room display name
 */
export function formatRoomName(room: RoomPublic): string {
  const star = room.category?.name?.toLowerCase().includes("vip") ? " ⭐" : ""
  return `${room.room_number}${star}`
}

/**
 * Sort rooms by number (handles alphanumeric)
 */
export function sortRoomsByNumber(rooms: RoomPublic[]): RoomPublic[] {
  return [...rooms].sort((a, b) => {
    // Extract numbers from room numbers
    const aNum = Number.parseInt(a.room_number.replace(/\D/g, ""), 10)
    const bNum = Number.parseInt(b.room_number.replace(/\D/g, ""), 10)

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum
    }

    // Fallback to string comparison
    return a.room_number.localeCompare(b.room_number)
  })
}
