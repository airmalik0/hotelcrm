import type { UserRole } from "@/client/types.gen"
import { useAuth } from "@/contexts/AuthContext"

export function useRole() {
  const { user } = useAuth()

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return user?.role ? roles.includes(user.role) : false
  }

  const isAdmin = (): boolean => hasRole("admin")
  const isManager = (): boolean => hasRole("manager")
  const isHost = (): boolean => hasRole("host")

  const isAdminOrManager = (): boolean => hasAnyRole(["admin", "manager"])

  const canManageUsers = (): boolean => isAdmin()
  const canViewAudit = (): boolean => isAdmin()
  const canManageRooms = (): boolean => isAdminOrManager()
  const canManageCustomers = (): boolean =>
    hasAnyRole(["admin", "manager", "host"])
  const canDeleteCustomers = (): boolean => isAdminOrManager()
  const canDeleteBookings = (): boolean => isAdminOrManager()
  const canCheckInOut = (): boolean => hasAnyRole(["admin", "manager", "host"])
  const canUpdateDiscount = (): boolean => isAdminOrManager()
  const canMarkRoomAvailable = (): boolean =>
    hasAnyRole(["admin", "manager", "host"])

  // New booking operation permissions
  const canPerformActualOperations = (): boolean =>
    hasAnyRole(["admin", "manager", "host"]) // All roles can set actual times

  const canModifyPlannedDates = (): boolean =>
    isAdminOrManager() // Only admin/manager can change planned dates with payment recalc

  const canChangeRoom = (bookingStatus?: string): boolean => {
    // Hosts can change rooms for confirmed bookings
    // Admin/Manager can change rooms for any status
    if (isAdminOrManager()) return true
    if (isHost() && bookingStatus === "confirmed") return true
    return false
  }

  const canCancelBooking = (): boolean =>
    hasAnyRole(["admin", "manager", "host"]) // All roles can cancel

  const canViewPaymentAdjustments = (): boolean =>
    isAdminOrManager() // Only admin/manager can see payment differences

  return {
    user,
    role: user?.role,
    hasRole,
    hasAnyRole,
    isAdmin,
    isManager,
    isHost,
    isAdminOrManager,
    canManageUsers,
    canViewAudit,
    canManageRooms,
    canManageCustomers,
    canDeleteCustomers,
    canDeleteBookings,
    canCheckInOut,
    canUpdateDiscount,
    canMarkRoomAvailable,
    canPerformActualOperations,
    canModifyPlannedDates,
    canChangeRoom,
    canCancelBooking,
    canViewPaymentAdjustments,
  }
}
