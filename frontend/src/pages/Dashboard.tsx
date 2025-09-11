import { useRole } from "@/hooks/useRole"
import React from "react"
import { AdminDashboard } from "./dashboards/AdminDashboard"
import { HostDashboard } from "./dashboards/HostDashboard"
import { ManagerDashboard } from "./dashboards/ManagerDashboard"

export function Dashboard() {
  const { user } = useRole()

  switch (user?.role) {
    case "admin":
      return <AdminDashboard />
    case "manager":
      return <ManagerDashboard />
    case "host":
      return <HostDashboard />
    default:
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              You don't have permission to access this dashboard.
            </p>
          </div>
        </div>
      )
  }
}
