import type {
  BookingCreate,
  BookingPublic,
  BookingStatus,
  BookingUpdate,
  BookingsPublic,
  Message,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

export interface BookingParams {
  skip?: number
  limit?: number
  status?: BookingStatus
  room_id?: string
  customer_id?: string
}

/**
 * Get list of bookings with optional filters
 */
export async function getBookings(
  params?: BookingParams,
): Promise<BookingsPublic> {
  const response = await apiClient.get<BookingsPublic>("/api/v1/bookings/", {
    params: {
      skip: params?.skip || 0,
      limit: params?.limit || 100,
      status: params?.status,
      room_id: params?.room_id,
      customer_id: params?.customer_id,
    },
  })
  return response.data
}

/**
 * Get single booking by ID
 */
export async function getBooking(bookingId: string): Promise<BookingPublic> {
  const response = await apiClient.get<BookingPublic>(
    `/api/v1/bookings/${bookingId}`,
  )
  return response.data
}

/**
 * Create new booking
 */
export async function createBooking(
  data: BookingCreate,
): Promise<BookingPublic> {
  const response = await apiClient.post<BookingPublic>(
    "/api/v1/bookings/",
    data,
  )
  return response.data
}

/**
 * Update existing booking
 */
export async function updateBooking(
  bookingId: string,
  data: BookingUpdate,
): Promise<BookingPublic> {
  const response = await apiClient.put<BookingPublic>(
    `/api/v1/bookings/${bookingId}`,
    data,
  )
  return response.data
}

/**
 * Delete booking
 */
export async function deleteBooking(bookingId: string): Promise<Message> {
  const response = await apiClient.delete<Message>(
    `/api/v1/bookings/${bookingId}`,
  )
  return response.data
}

/**
 * Parameters for getting bookings by date range
 */
export interface BookingDateRangeParams {
  startDate: Date | string
  endDate: Date | string
  roomId?: string
}

/**
 * Get bookings for a specific date range
 */
export async function getBookingsByDateRange(
  params: BookingDateRangeParams
): Promise<BookingsPublic> {
  const { startDate, endDate, roomId } = params
  const start = typeof startDate === "string" ? startDate : startDate.toISOString()
  const end = typeof endDate === "string" ? endDate : endDate.toISOString()

  const response = await apiClient.get<BookingsPublic>("/api/v1/bookings/", {
    params: {
      date_from: start.split("T")[0], // Backend expects YYYY-MM-DD format
      date_to: end.split("T")[0],
      room_id: roomId,
      limit: 500 // High limit to get all bookings in range
    }
  })
  return response.data
}

/**
 * Parameters for checking room availability
 */
export interface RoomAvailabilityParams {
  roomId: string
  checkIn: Date | string
  checkOut: Date | string
  excludeBookingId?: string
}

/**
 * Check if a room is available for a specific time period
 */
export async function checkRoomAvailability(
  params: RoomAvailabilityParams
): Promise<boolean> {
  const { roomId, checkIn, checkOut, excludeBookingId } = params
  const bookings = await getBookingsByDateRange({
    startDate: checkIn,
    endDate: checkOut,
    roomId
  })

  const checkInTime = typeof checkIn === "string" ? new Date(checkIn) : checkIn
  const checkOutTime = typeof checkOut === "string" ? new Date(checkOut) : checkOut

  // Check for conflicts
  const hasConflict = bookings.data.some(booking => {
    // Skip if it's the same booking we're editing
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false
    }

    const existingCheckIn = new Date(booking.check_in)
    const existingCheckOut = new Date(booking.check_out)

    // Check for overlap
    return !(checkOutTime <= existingCheckIn || checkInTime >= existingCheckOut)
  })

  return !hasConflict
}

/**
 * Quick booking creation with smart defaults
 */
export interface QuickBookingParams {
  customerId: string
  roomId: string
  checkIn: Date
  checkOut?: Date
}

export async function createQuickBooking(
  params: QuickBookingParams
): Promise<BookingPublic> {
  const { customerId, roomId, checkIn, checkOut } = params

  // Default checkout is next day at noon if not provided
  const actualCheckOut = checkOut || (() => {
    const nextDay = new Date(checkIn)
    nextDay.setDate(nextDay.getDate() + 1)
    nextDay.setHours(12, 0, 0, 0)
    return nextDay
  })()

  // Get room details to calculate total amount
  const room = await getRoom(roomId)

  // Calculate number of nights exactly like backend
  // Backend logic: nights = (check_out.date() - check_in.date()).days; nights = max(1, nights)
  const checkInDate = new Date(checkIn.getTime())
  const checkOutDate = new Date(actualCheckOut.getTime())

  // Reset time to match backend .date() behavior
  checkInDate.setHours(0, 0, 0, 0)
  checkOutDate.setHours(0, 0, 0, 0)

  // Calculate days difference and ensure minimum 1 night
  const nightsDiff = Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  const nights = Math.max(1, nightsDiff)

  // Calculate total amount (no discount for quick booking)
  const totalAmount = room.price_per_night * nights

  const bookingData: BookingCreate = {
    customer_id: customerId,
    room_id: roomId,
    check_in: checkIn.toISOString(),
    check_out: actualCheckOut.toISOString(),
    status: "confirmed",
    total_amount: totalAmount
  }

  return createBooking(bookingData)
}

/**
 * Update booking status (check-in, check-out, cancel)
 */
export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<BookingPublic> {
  return updateBooking(bookingId, { status })
}
