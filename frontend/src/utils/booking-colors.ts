import type { BookingStatus } from "@/client/types.gen"

/**
 * Get color classes for booking status
 */
export function getBookingStatusColor(status: BookingStatus): string {
  const colors = {
    confirmed: "bg-emerald-500 border-emerald-600 text-white",
    checked_in: "bg-blue-500 border-blue-600 text-white",
    checked_out: "bg-violet-500 border-violet-600 text-white",
    cancelled: "bg-red-100 border-red-300 text-red-700",
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
    cancelled: "hover:bg-red-200 hover:border-red-400",
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
    cancelled: "bg-red-400",
  }

  return colors[status] || colors.confirmed
}

/**
 * Get room status color
 */
export function getRoomStatusColor(status: string | undefined): string {
  const colors: Record<string, string> = {
    AVAILABLE:
      "bg-green-100 dark:bg-green-600/25 text-green-700 dark:text-green-400",
    OCCUPIED:
      "bg-blue-100 dark:bg-blue-600/25 text-blue-700 dark:text-blue-400",
    CLEANING:
      "bg-yellow-100 dark:bg-yellow-600/25 text-yellow-700 dark:text-yellow-400",
    MAINTENANCE:
      "bg-gray-100 dark:bg-gray-600/25 text-gray-700 dark:text-gray-400",
  }

  return colors[status ?? "AVAILABLE"] || colors.AVAILABLE
}

/**
 * Get room type badge color
 */
export function getRoomTypeColor(type: string): string {
  const colors: Record<string, string> = {
    STANDARD:
      "bg-gray-100 dark:bg-gray-600/25 text-gray-700 dark:text-gray-400",
    VIP: "bg-purple-100 dark:bg-purple-600/25 text-purple-700 dark:text-purple-400",
    SUITE:
      "bg-indigo-100 dark:bg-indigo-600/25 text-indigo-700 dark:text-indigo-400",
    DELUXE: "bg-cyan-100 dark:bg-cyan-600/25 text-cyan-700 dark:text-cyan-400",
  }

  return colors[type] || colors.STANDARD
}

/**
 * Get drag state classes
 */
export function getDragStateClasses(
  isDragging: boolean,
  isValidDrop: boolean,
): string {
  if (!isDragging) return ""

  if (isValidDrop) {
    return "bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600"
  }

  return "bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600 opacity-50"
}
