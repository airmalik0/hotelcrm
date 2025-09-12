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
