import { getBookings } from "@/api/bookings"
import { getCustomers } from "@/api/customers"
import { KPICard } from "@/components/dashboard/KPICard"
import { useLanguage } from "@/contexts/LanguageContext"
import { safeParseDate } from "@/utils/date-helpers"
import { formatCurrency } from "@/utils/formatters"
import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  ClipboardList,
  Clock,
  LogIn,
  LogOut,
  Users,
} from "lucide-react"
import React from "react"

export function HostDashboard() {
  const { currency, t } = useLanguage()
  // Fetch all data using our API wrappers
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["customers", "all"],
    queryFn: () => getCustomers({ limit: 1000 }),
  })

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", "all"],
    queryFn: () => getBookings({ limit: 1000 }),
  })

  // Calculate today's metrics
  const today = new Date().toDateString()

  const todayCheckIns =
    bookings?.data?.filter(
      (booking) =>
        safeParseDate(booking.check_in).toDateString() === today &&
        booking.status !== "cancelled",
    ) || []

  const todayCheckOuts =
    bookings?.data?.filter(
      (booking) =>
        safeParseDate(booking.check_out).toDateString() === today &&
        booking.status !== "cancelled",
    ) || []

  const pendingCheckIns = todayCheckIns.filter(
    (booking) => booking.status === "confirmed",
  )
  const completedCheckIns = todayCheckIns.filter(
    (booking) => booking.status === "checked_in",
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.pages.dashboard.host.title}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {t.pages.dashboard.host.frontDeskOperations}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}{" "}
          •{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Today's KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title={t.pages.dashboard.host.todaysCheckIns}
          value={todayCheckIns.length}
          icon={LogIn}
          color="primary"
          loading={bookingsLoading}
        />

        <KPICard
          title={t.pages.dashboard.host.todaysCheckOuts}
          value={todayCheckOuts.length}
          icon={LogOut}
          color="success"
          loading={bookingsLoading}
        />

        <KPICard
          title={t.pages.dashboard.host.pendingTasks}
          value={pendingCheckIns.length}
          icon={ClipboardList}
          color="warning"
          loading={bookingsLoading}
        />

        <KPICard
          title={t.pages.dashboard.host.totalCustomers}
          value={customers?.count || 0}
          icon={Users}
          color="purple"
          loading={customersLoading}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Today's Schedule
              </h3>
              <Calendar className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </div>

            {/* Check-ins Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <LogIn className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h4 className="font-medium text-neutral-900 dark:text-white">
                  {t.pages.dashboard.host.checkIns} ({todayCheckIns.length})
                </h4>
              </div>

              <div className="space-y-3">
                {todayCheckIns.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-600/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {booking.customer?.first_name?.charAt(0)}
                          {booking.customer?.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {booking.customer?.first_name}{" "}
                          {booking.customer?.last_name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Room {booking.room?.room_number} •{" "}
                          {safeParseDate(booking.check_in).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === "confirmed"
                            ? "bg-warning-100 dark:bg-warning-600/30 text-warning-600 dark:text-warning-400"
                            : "bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400"
                        }`}
                      >
                        {booking.status === "confirmed"
                          ? "Pending"
                          : "Checked In"}
                      </span>
                    </div>
                  </div>
                ))}

                {todayCheckIns.length === 0 && (
                  <div className="text-center py-6">
                    <LogIn className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No check-ins scheduled for today
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Check-outs Section */}
            <div className="border-t border-neutral-200 dark:border-neutral-600 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <LogOut className="w-5 h-5 text-success-600 dark:text-success-400" />
                <h4 className="font-medium text-neutral-900 dark:text-white">
                  {t.pages.dashboard.host.todaysCheckOuts} ({todayCheckOuts.length})
                </h4>
              </div>

              <div className="space-y-3">
                {todayCheckOuts.slice(0, 3).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-success-50 dark:bg-success-600/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-success-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {booking.customer?.first_name?.charAt(0)}
                          {booking.customer?.last_name?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {booking.customer?.first_name}{" "}
                          {booking.customer?.last_name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Room {booking.room?.room_number} •{" "}
                          {safeParseDate(booking.check_out).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {formatCurrency(booking.total_amount, currency)}
                      </p>
                    </div>
                  </div>
                ))}

                {todayCheckOuts.length === 0 && (
                  <div className="text-center py-6">
                    <LogOut className="w-12 h-12 text-neutral-400 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No check-outs scheduled for today
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="space-y-6">
          {/* Status Summary */}
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Status Summary
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t.pages.dashboard.host.completedCheckIns}
                </span>
                <span className="text-sm font-medium text-success-600 dark:text-success-400">
                  {completedCheckIns.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t.pages.dashboard.host.pendingCheckIns}
                </span>
                <span className="text-sm font-medium text-warning-600 dark:text-warning-400">
                  {pendingCheckIns.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  Active Bookings
                </span>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {bookings?.data?.filter((b) => b.status === "checked_in")
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
