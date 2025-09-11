import type { UserRole } from "@/client"
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
  }
}
