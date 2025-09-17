import type { QueryClient } from "@tanstack/react-query"

/**
 * Utility functions for invalidating related queries when data changes.
 * Ensures UI stays in sync with backend state changes.
 */

/**
 * Invalidate all queries related to booking operations.
 * Used after operations that affect bookings, rooms, and potentially customers.
 */
export function invalidateBookingRelated(
  queryClient: QueryClient,
  options?: {
    includeRooms?: boolean
    includeCustomers?: boolean
    bookingId?: string
    roomId?: string
    customerId?: string
  },
) {
  const {
    includeRooms = true,
    includeCustomers = false,
    bookingId,
    roomId,
    customerId,
  } = options || {}

  // Always invalidate bookings
  queryClient.invalidateQueries({ queryKey: ["bookings"] })

  // Invalidate specific booking if ID provided
  if (bookingId) {
    queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
  }

  // Invalidate rooms (status changes on check-in/out)
  if (includeRooms) {
    queryClient.invalidateQueries({ queryKey: ["rooms"] })
    if (roomId) {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] })
    }
  }

  // Invalidate customers (stats change on booking create/delete)
  if (includeCustomers) {
    queryClient.invalidateQueries({ queryKey: ["customers"] })
    if (customerId) {
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] })
    }
  }
}

/**
 * Invalidate queries after check-in operation.
 * Backend changes: booking status → CHECKED_IN, room status → OCCUPIED
 */
export function invalidateAfterCheckIn(
  queryClient: QueryClient,
  bookingId: string,
  roomId?: string,
) {
  invalidateBookingRelated(queryClient, {
    includeRooms: true,
    includeCustomers: false,
    bookingId,
    roomId,
  })
}

/**
 * Invalidate queries after check-out operation.
 * Backend changes: booking status → CHECKED_OUT, room status → CLEANING
 */
export function invalidateAfterCheckOut(
  queryClient: QueryClient,
  bookingId: string,
  roomId?: string,
) {
  invalidateBookingRelated(queryClient, {
    includeRooms: true,
    includeCustomers: false,
    bookingId,
    roomId,
  })
}

/**
 * Invalidate queries after booking creation.
 * Backend changes: new booking created, customer stats updated
 */
export function invalidateAfterBookingCreate(
  queryClient: QueryClient,
  customerId: string,
  roomId?: string,
) {
  invalidateBookingRelated(queryClient, {
    includeRooms: false, // Room status doesn't change on create (only on check-in)
    includeCustomers: true, // Customer stats are updated
    customerId,
    roomId,
  })
}

/**
 * Invalidate queries after booking cancellation.
 * Backend changes: booking status → CANCELLED,
 * room status → CLEANING (if was checked in), customer stats updated
 */
export function invalidateAfterBookingCancel(
  queryClient: QueryClient,
  bookingId: string,
  customerId: string,
  roomId?: string,
  wasCheckedIn?: boolean,
) {
  invalidateBookingRelated(queryClient, {
    includeRooms: wasCheckedIn || false, // Room changes only if was checked in
    includeCustomers: true, // Customer stats always updated
    bookingId,
    customerId,
    roomId,
  })
}

/**
 * Invalidate queries after booking update.
 * Backend changes depend on what was updated.
 */
export function invalidateAfterBookingUpdate(
  queryClient: QueryClient,
  bookingId: string,
  options?: {
    roomChanged?: boolean
    customerChanged?: boolean
    oldRoomId?: string
    newRoomId?: string
    oldCustomerId?: string
    newCustomerId?: string
  },
) {
  const {
    roomChanged = false,
    customerChanged = false,
    oldRoomId,
    newRoomId,
    oldCustomerId,
    newCustomerId,
  } = options || {}

  // Always invalidate bookings
  queryClient.invalidateQueries({ queryKey: ["bookings"] })
  queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })

  // If room changed, both old and new rooms need update
  if (roomChanged) {
    queryClient.invalidateQueries({ queryKey: ["rooms"] })
    if (oldRoomId) {
      queryClient.invalidateQueries({ queryKey: ["room", oldRoomId] })
    }
    if (newRoomId) {
      queryClient.invalidateQueries({ queryKey: ["room", newRoomId] })
    }
  }

  // If customer changed, both old and new customers need update
  if (customerChanged) {
    queryClient.invalidateQueries({ queryKey: ["customers"] })
    if (oldCustomerId) {
      queryClient.invalidateQueries({ queryKey: ["customer", oldCustomerId] })
    }
    if (newCustomerId) {
      queryClient.invalidateQueries({ queryKey: ["customer", newCustomerId] })
    }
  }
}
