import type {
  BookingCreate,
  BookingPublic,
  BookingStatus,
  BookingUpdate,
  BookingsPublic,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

interface GetBookingsParams {
  skip?: number
  limit?: number
  room_id?: string
  customer_id?: string
  status?: BookingStatus
  date_from?: string
  date_to?: string
}

export async function getBookings(
  params?: GetBookingsParams,
): Promise<BookingsPublic> {
  const response = await apiClient.get<BookingsPublic>("/api/v1/bookings/", {
    params,
  })
  return response.data
}

export async function getBooking(id: string): Promise<BookingPublic> {
  const response = await apiClient.get<BookingPublic>(`/api/v1/bookings/${id}`)
  return response.data
}

export async function createBooking(
  data: BookingCreate,
): Promise<BookingPublic> {
  const response = await apiClient.post<BookingPublic>(
    "/api/v1/bookings/",
    data,
  )
  return response.data
}

export async function updateBooking(
  id: string,
  data: BookingUpdate,
): Promise<BookingPublic> {
  const response = await apiClient.put<BookingPublic>(
    `/api/v1/bookings/${id}`,
    data,
  )
  return response.data
}

export async function deleteBooking(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/bookings/${id}`)
}

export async function checkInBooking(id: string): Promise<BookingPublic> {
  const response = await apiClient.post<BookingPublic>(
    `/api/v1/bookings/${id}/check-in`,
  )
  return response.data
}

export async function checkOutBooking(id: string): Promise<BookingPublic> {
  const response = await apiClient.post<BookingPublic>(
    `/api/v1/bookings/${id}/check-out`,
  )
  return response.data
}
