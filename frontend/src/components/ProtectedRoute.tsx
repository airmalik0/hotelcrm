import type { UserRole } from "@/client"
import { useAuth } from "@/contexts/AuthContext"
import { useRole } from "@/hooks/useRole"
import React, { type ReactNode } from "react"
import { Navigate } from "react-router-dom"

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const { hasAnyRole } = useRole()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check role permissions if roles are specified
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-1 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-8 text-center">
          <div className="w-16 h-16 bg-danger-100 dark:bg-danger-600/25 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            You don't have permission to access this page. Contact your
            administrator if you believe this is an error.
          </p>
          <button
            onClick={() => window.history.back()}
            className="rounded-lg py-2 px-4 inline-flex transition bg-primary-600 text-white hover:bg-primary-700 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
