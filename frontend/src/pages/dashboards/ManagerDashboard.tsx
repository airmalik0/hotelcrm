import { getQuickStats } from "@/api/analytics"
import { getCustomers } from "@/api/customers"
import { getRooms } from "@/api/rooms"
import { KPICard } from "@/components/dashboard/KPICard"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrency } from "@/utils/formatters"
import { useQuery } from "@tanstack/react-query"
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
  const { currency, t } = useLanguage()
  // Fetch analytics data from unified API
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics", "quick-stats"],
    queryFn: getQuickStats,
  })

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", "all"],
    queryFn: () => getRooms({ limit: 1000 }),
  })

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => getCustomers({ limit: 1000 }),
  })

  // Use analytics API data instead of manual calculations
  const todaysRevenue = analytics?.data?.today?.revenue || 0
  const todaysBookings = analytics?.data?.today?.bookings || 0
  const occupancyRate = analytics?.data?.today?.occupancy || 0
  const monthRevenue = analytics?.data?.month?.revenue || 0

  // Keep room counts from rooms API (for room status breakdown)
  const totalRooms = rooms?.count || 0
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
            {t.pages.dashboard.manager.title}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {t.pages.dashboard.manager.description}
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
          title={t.pages.dashboard.manager.todaysOccupancy}
          value={`${occupancyRate}%`}
          icon={Building2}
          color="primary"
          loading={analyticsLoading}
        />

        <KPICard
          title={t.pages.dashboard.manager.todaysBookings}
          value={todaysBookings}
          icon={Calendar}
          color="success"
          loading={analyticsLoading}
        />

        <KPICard
          title={t.pages.dashboard.manager.monthRevenue}
          value={formatCurrency(monthRevenue, currency)}
          icon={DollarSign}
          color="warning"
          loading={analyticsLoading}
        />

        <KPICard
          title={t.pages.dashboard.manager.totalCustomers}
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
                <div className="w-12 h-12 bg-success-100 dark:bg-success-600/30 rounded-full flex items-center justify-center mx-auto mb-2">
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
                <div className="w-12 h-12 bg-danger-100 dark:bg-danger-600/30 rounded-full flex items-center justify-center mx-auto mb-2">
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
                <div className="w-12 h-12 bg-warning-100 dark:bg-warning-600/30 rounded-full flex items-center justify-center mx-auto mb-2">
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
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-600/30 rounded-full flex items-center justify-center mx-auto mb-2">
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

            {/* Analytics Summary */}
            <div className="border-t border-neutral-200 dark:border-neutral-600 pt-6">
              <h4 className="font-medium text-neutral-900 dark:text-white mb-4">
                Today's Performance
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Revenue
                  </span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {formatCurrency(todaysRevenue, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Bookings
                  </span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {todaysBookings}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {t.pages.dashboard.manager.occupancyRate}
                  </span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {occupancyRate}%
                  </span>
                </div>
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
                  Today's Bookings
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {todaysBookings}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t.pages.dashboard.manager.availableRooms}
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {availableRooms}
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
        </div>
      </div>
    </div>
  )
}
