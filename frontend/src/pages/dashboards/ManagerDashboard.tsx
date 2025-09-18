// import {
//   bookingsReadBookings,
//   customersReadCustomers,
//   roomsReadRooms,
// } from "@/client"
import { KPICard } from "@/components/dashboard/KPICard"
// import { useQuery } from "@tanstack/react-query"
import {
  Building2,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react"
import React from "react"

export function ManagerDashboard() {
  // Temporarily disabled until API endpoints are created
  const rooms = { data: [], count: 0 }
  const customers = { data: [], count: 0 }
  const bookings = { data: [], count: 0 }
  const roomsLoading = false
  const customersLoading = false
  const bookingsLoading = false

  // Calculate metrics
  const totalRevenue =
    bookings?.data?.reduce((sum, booking) => sum + booking.total_amount, 0) || 0
  const occupiedRooms =
    rooms?.data?.filter((room) => room.status === "occupied").length || 0
  const availableRooms =
    rooms?.data?.filter((room) => room.status === "available").length || 0

  const todayBookings =
    bookings?.data?.filter((booking) => {
      const today = new Date().toDateString()
      return new Date(booking.check_in).toDateString() === today
    }) || []

  const occupancyRate = rooms?.count
    ? Math.round((occupiedRooms / rooms.count) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Manager Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Operations overview and management tools
          </p>
        </div>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Room Occupancy"
          value={`${occupancyRate}%`}
          icon={Building2}
          color="primary"
          loading={roomsLoading}
        />

        <KPICard
          title="Today's Bookings"
          value={todayBookings.length}
          icon={Calendar}
          color="success"
          loading={bookingsLoading}
        />

        <KPICard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="warning"
          loading={bookingsLoading}
        />

        <KPICard
          title="Total Customers"
          value={customers?.count || 0}
          icon={Users}
          color="purple"
          loading={customersLoading}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Status Overview */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Room Status Overview
              </h3>
              <Building2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-success-100 dark:bg-success-600/25 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-6 h-6 text-success-600 dark:text-success-400" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {availableRooms}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Available
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-danger-100 dark:bg-danger-600/25 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-6 h-6 text-danger-600 dark:text-danger-400" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {occupiedRooms}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Occupied
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-warning-100 dark:bg-warning-600/25 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-6 h-6 text-warning-600 dark:text-warning-400" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {rooms?.data?.filter((room) => room.status === "cleaning")
                    .length || 0}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Cleaning
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-600/25 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {rooms?.data?.filter((room) => room.status === "maintenance")
                    .length || 0}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Maintenance
                </p>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="border-t border-neutral-200 dark:border-neutral-600 pt-6">
              <h4 className="font-medium text-neutral-900 dark:text-white mb-4">
                Recent Bookings
              </h4>
              <div className="space-y-3">
                {bookings?.data?.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-600/25 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {booking.customer?.first_name}{" "}
                          {booking.customer?.last_name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Room {booking.room?.room_number}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        ${booking.total_amount}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {new Date(booking.check_in).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Today's Schedule */}
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Today's Schedule
              </h3>
              <Clock className="w-5 h-5 text-primary-600" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Check-ins
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {todayBookings.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Check-outs
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {bookings?.data?.filter((booking) => {
                    const today = new Date().toDateString()
                    return new Date(booking.check_out).toDateString() === today
                  }).length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Cleaning Tasks
                </span>
                <span className="text-sm font-medium text-warning-600 dark:text-warning-400">
                  {rooms?.data?.filter((room) => room.status === "cleaning")
                    .length || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Performance
              </h3>
              <TrendingUp className="w-5 h-5 text-success-600" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Revenue Growth
                </span>
                <span className="text-sm font-medium text-success-600 dark:text-success-400">
                  +12%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Customer Satisfaction
                </span>
                <span className="text-sm font-medium text-success-600 dark:text-success-400">
                  4.8/5
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Avg. Stay Duration
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  2.3 days
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
