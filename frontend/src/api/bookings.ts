import type {
  BookingCreate,
  BookingGuestCreate,
  BookingGuestPublic,
  BookingGuestUpdate,
  BookingGuestsPublic,
  BookingPublic,
  BookingStatus,
  BookingUpdate,
  BookingsPublic,
  DateModificationRequest,
  DiscountModificationRequest,
  Message,
  PaymentAdjustmentResponse,
  RoomChangeRequest,
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

export async function actualCheckInBooking(id: string): Promise<BookingPublic> {
  const response = await apiClient.post<BookingPublic>(
    `/api/v1/bookings/${id}/actual-check-in`,
  )
  return response.data
}

export async function actualCheckOutBooking(
  id: string,
): Promise<BookingPublic> {
  const response = await apiClient.post<BookingPublic>(
    `/api/v1/bookings/${id}/actual-check-out`,
  )
  return response.data
}

export async function modifyBookingDates(
  id: string,
  data: DateModificationRequest,
): Promise<PaymentAdjustmentResponse> {
  const response = await apiClient.put<PaymentAdjustmentResponse>(
    `/api/v1/bookings/${id}/modify-dates`,
    data,
  )
  return response.data
}

export async function changeBookingRoom(
  id: string,
  data: RoomChangeRequest,
): Promise<PaymentAdjustmentResponse> {
  const response = await apiClient.put<PaymentAdjustmentResponse>(
    `/api/v1/bookings/${id}/change-room`,
    data,
  )
  return response.data
}

export async function modifyBookingDiscount(
  id: string,
  data: DiscountModificationRequest,
): Promise<PaymentAdjustmentResponse> {
  const response = await apiClient.put<PaymentAdjustmentResponse>(
    `/api/v1/bookings/${id}/modify-discount`,
    data,
  )
  return response.data
}

// Booking Guests API
export async function getBookingGuests(
  bookingId: string,
): Promise<BookingGuestsPublic> {
  const response = await apiClient.get<BookingGuestsPublic>(
    `/api/v1/bookings/${bookingId}/guests`,
  )
  return response.data
}

export async function addGuestToBooking(
  bookingId: string,
  data: BookingGuestCreate,
): Promise<BookingGuestPublic> {
  const response = await apiClient.post<BookingGuestPublic>(
    `/api/v1/bookings/${bookingId}/guests`,
    data,
  )
  return response.data
}

export async function updateBookingGuest(
  bookingId: string,
  guestId: string,
  data: BookingGuestUpdate,
): Promise<BookingGuestPublic> {
  const response = await apiClient.put<BookingGuestPublic>(
    `/api/v1/bookings/${bookingId}/guests/${guestId}`,
    data,
  )
  return response.data
}

export async function removeGuestFromBooking(
  bookingId: string,
  guestId: string,
): Promise<Message> {
  const response = await apiClient.delete<Message>(
    `/api/v1/bookings/${bookingId}/guests/${guestId}`,
  )
  return response.data
}
