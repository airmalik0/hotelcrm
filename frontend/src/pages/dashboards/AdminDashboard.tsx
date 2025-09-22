import { getQuickStats } from "@/api/analytics"
import { getBookings } from "@/api/bookings"
import { getCustomers } from "@/api/customers"
import { getRooms } from "@/api/rooms"
import { getUsers } from "@/api/users"
import { KPICard } from "@/components/dashboard/KPICard"
import { formatCurrency } from "@/utils/formatters"
import { safeParseDate } from "@/utils/date-helpers"
import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react"
import React from "react"

export function AdminDashboard() {
  // Fetch analytics data from unified API
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics", "quick-stats"],
    queryFn: getQuickStats,
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers({ limit: 1000 }),
  })

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", "all"],
    queryFn: () => getRooms({ limit: 1000 }),
  })

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => getCustomers({ limit: 1000 }),
  })

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", "recent"],
    queryFn: () => getBookings({ limit: 50 }),
  })

  // Use analytics API data instead of manual calculations
  const totalRevenue = analytics?.data?.month?.revenue || 0
  const todayBookings = analytics?.data?.today?.bookings || 0
  const occupancyRate = analytics?.data?.today?.occupancy || 0

  // Keep room status from rooms API (for room management, not analytics)
  const availableRooms =
    rooms?.data?.filter((room) => room.status === "available").length || 0
  const occupiedRooms =
    rooms?.data?.filter((room) => room.status === "occupied").length || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            System overview and management tools
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Users"
          value={users?.count || 0}
          icon={Users}
          color="primary"
          loading={usersLoading}
        />

        <KPICard
          title="Total Rooms"
          value={rooms?.count || 0}
          icon={Building2}
          color="success"
          loading={roomsLoading}
        />

        <KPICard
          title="Total Customers"
          value={customers?.count || 0}
          icon={Users}
          color="warning"
          loading={customersLoading}
        />

        <KPICard
          title="Month Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          color="purple"
          loading={analyticsLoading}
        />
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Recent Activity
              </h3>
              <Activity className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>

            <div className="space-y-4">
              {bookings?.data?.slice(0, 5).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between py-3 border-b border-neutral-100 dark:border-neutral-700 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-600/30 rounded-full flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        New booking created
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {booking.customer?.first_name}{" "}
                        {booking.customer?.last_name} • Room{" "}
                        {booking.room?.room_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      ${booking.total_amount}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {safeParseDate(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              {!bookings?.data?.length && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No recent bookings
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Today's Overview
              </h3>
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Check-ins
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {todayBookings}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Available Rooms
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {availableRooms}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Occupancy Rate
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {occupancyRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
