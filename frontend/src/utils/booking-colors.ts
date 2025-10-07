import type { BookingStatus } from "@/client/types.gen"

/**
 * Get color classes for booking status
 */
export function getBookingStatusColor(status: BookingStatus): string {
  const colors = {
    confirmed: "bg-emerald-500 border-emerald-600 text-white",
    checked_in: "bg-blue-500 border-blue-600 text-white",
    checked_out: "bg-violet-500 border-violet-600 text-white",
    cancelled: "bg-danger-100 border-danger-300 text-danger-700",
  }

  return colors[status] || colors.confirmed
}

/**
 * Get hover color classes for booking status
 */
export function getBookingHoverColor(status: BookingStatus): string {
  const colors = {
    confirmed: "hover:bg-emerald-600 hover:border-emerald-700",
    checked_in: "hover:bg-blue-600 hover:border-blue-700",
    checked_out: "hover:bg-violet-600 hover:border-violet-700",
    cancelled: "hover:bg-danger-200 hover:border-danger-400",
  }

  return colors[status] || colors.confirmed
}

/**
 * Get indicator dot color for booking status
 */
export function getBookingIndicatorColor(status: BookingStatus): string {
  const colors = {
    confirmed: "bg-emerald-400",
    checked_in: "bg-blue-400 animate-pulse",
    checked_out: "bg-violet-400",
    cancelled: "bg-danger-400",
  }

  return colors[status] || colors.confirmed
}

/**
 * Get room status color
 */
export function getRoomStatusColor(status: string | undefined): string {
  const colors: Record<string, string> = {
    AVAILABLE:
      "bg-green-100 dark:bg-green-600/30 text-green-700 dark:text-green-400",
    OCCUPIED:
      "bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-400",
    CLEANING:
      "bg-yellow-100 dark:bg-yellow-600/30 text-yellow-700 dark:text-yellow-400",
    MAINTENANCE:
      "bg-neutral-100 dark:bg-neutral-600/30 text-neutral-700 dark:text-neutral-400",
  }

  return colors[status ?? "AVAILABLE"] || colors.AVAILABLE
}

/**
 * Get room type badge color
 */
// Room type color removed; categories are displayed with neutral badge

/**
 * Get drag state classes
 */
export function getDragStateClasses(
  isDragging: boolean,
  isValidDrop: boolean,
): string {
  if (!isDragging) return ""

  if (isValidDrop) {
    return "bg-green-50 dark:bg-green-600/30 border-green-400 dark:border-green-600"
  }

  return "bg-danger-50 dark:bg-danger-600/30 border-danger-400 dark:border-danger-600 opacity-50"
}
