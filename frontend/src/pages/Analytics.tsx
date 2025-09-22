import {
  exportToPdf,
  getDashboardMetrics,
} from "@/api/analytics"
import type {
  AnalyticsExportRequest,
  DashboardMetrics,
} from "@/client/types.gen"
import {
  CustomerDemographicsChart,
  PaymentDistributionChart,
  RevenueTrendChart,
  RoomPerformanceChart,
} from "@/components/analytics/AnalyticsCharts"
import { useAuth } from "@/contexts/AuthContext"
import { showError, showSuccess } from "@/utils/error-handling"
import { formatCurrency } from "@/utils/formatters"
import { useMutation, useQuery } from "@tanstack/react-query"
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import {
  BarChart3,
  Bed,
  Calendar,
  CreditCard,
  Download,
  DollarSign,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react"
import { useState } from "react"

export function Analytics() {
  const { user } = useAuth()
  // Default to current month
  const currentDate = new Date()
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(currentDate), "yyyy-MM-dd"),
    to: format(currentDate, "yyyy-MM-dd"), // Use today as end date, not end of month
  })

  // Check if user has admin access
  if (user?.role !== "admin" && !user?.is_superuser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            Analytics is available for administrators only.
          </p>
        </div>
      </div>
    )
  }


  // Fetch dashboard metrics with date range
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["analytics", "dashboard", dateRange],
    queryFn: () =>
      getDashboardMetrics({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
      }),
  })

  // PDF export mutation
  const exportMutation = useMutation({
    mutationFn: (request: AnalyticsExportRequest) => exportToPdf(request),
    onSuccess: () => {
      showSuccess("Report exported successfully!")
    },
    onError: (error) => {
      showError(error, "Failed to export report")
    },
  })

  const handleExportPdf = () => {
    exportMutation.mutate({
      filters: {
        date_from: new Date(`${dateRange.from}T00:00:00`),
        date_to: new Date(`${dateRange.to}T23:59:59`),
      },
      format: "pdf",
      include_charts: false,
    })
  }

  const handleDateChange = (type: "from" | "to", value: string) => {
    setDateRange((prev) => ({
      ...prev,
      [type]: value,
    }))
  }

  const setQuickDateRange = (type: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const now = new Date()
    let from: Date
    let to: Date = now

    switch(type) {
      case 'today':
        from = now
        to = now
        break
      case 'week':
        from = subMonths(now, 0)
        from.setDate(from.getDate() - 7)
        break
      case 'month':
        from = startOfMonth(now)
        break
      case 'quarter':
        from = startOfMonth(subMonths(now, 2))
        break
      case 'year':
        from = startOfMonth(subMonths(now, 11))
        to = endOfMonth(now)
        break
    }

    setDateRange({
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
    })
  }

  const metrics = dashboardData?.data as DashboardMetrics | undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Revenue insights, occupancy metrics, and customer demographics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPdf}
            disabled={exportMutation.isPending || !metrics}
            className="rounded-lg py-2 px-4 inline-flex items-center gap-2 transition bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateChange("from", e.target.value)}
              className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateChange("to", e.target.value)}
              className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setQuickDateRange('today')}
              className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
            >
              Today
            </button>
            <button
              onClick={() => setQuickDateRange('week')}
              className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setQuickDateRange('month')}
              className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickDateRange('quarter')}
              className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
            >
              Last 3 Months
            </button>
            <button
              onClick={() => setQuickDateRange('year')}
              className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
            >
              Last 12 Months
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Cards for Selected Period */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-primary-600/10 to-white dark:from-primary-600/20 dark:to-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Total Revenue
                </p>
                <h4 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {formatCurrency(metrics.revenue.total_revenue)}
                </h4>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {metrics.revenue.total_bookings} bookings
            </p>
          </div>

          {/* Occupancy Rate Card */}
          <div className="bg-gradient-to-br from-success-600/10 to-white dark:from-success-600/20 dark:to-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-success-600 text-white rounded-full flex items-center justify-center">
                <Bed className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Occupancy Rate
                </p>
                <h4 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {metrics.occupancy.occupancy_rate}%
                </h4>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {metrics.occupancy.average_length_of_stay.toFixed(1)} nights avg stay
            </p>
          </div>

          {/* Check-ins Card */}
          <div className="bg-gradient-to-br from-purple-600/10 to-white dark:from-purple-600/20 dark:to-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Check-ins
                </p>
                <h4 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {metrics.occupancy.check_ins}
                </h4>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {metrics.customer_metrics.total_customers} total guests
            </p>
          </div>

          {/* Cancellations Card */}
          <div className="bg-gradient-to-br from-danger-600/10 to-white dark:from-danger-600/20 dark:to-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 bg-danger-600 text-white rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Cancellations
                </p>
                <h4 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {metrics.occupancy.cancellations}
                </h4>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {metrics.occupancy.cancellations > 0
                ? `${((metrics.occupancy.cancellations / metrics.revenue.total_bookings) * 100).toFixed(1)}% rate`
                : 'No cancellations'
              }
            </p>
          </div>
        </div>
      )}

      {/* Main Metrics */}
      {metrics && (
        <>
          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Metrics */}
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Revenue Performance
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Average Daily Rate</span>
                  <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(metrics.revenue.average_daily_rate)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">RevPAR</span>
                  <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(metrics.revenue.revenue_per_available_room)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Avg Length of Stay</span>
                  <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {metrics.occupancy.average_length_of_stay.toFixed(1)} nights
                  </span>
                </div>
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-600">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">Period Total</span>
                    <span className="text-xl font-bold text-primary-600">
                      {formatCurrency(metrics.revenue.total_revenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Metrics */}
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Customer Analytics
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Total Customers</span>
                  <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {metrics.customer_metrics.total_customers}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">New Customers</span>
                  <span className="text-lg font-semibold text-success-600">
                    {metrics.customer_metrics.new_customers}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Returning Customers</span>
                  <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {metrics.customer_metrics.returning_customers}
                  </span>
                </div>
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-600">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">Average Age</span>
                    <span className="text-xl font-bold text-purple-600">
                      {metrics.customer_metrics.average_age
                        ? `${metrics.customer_metrics.average_age.toFixed(1)} years`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Occupancy Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Methods
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Cash</span>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-900 dark:text-white font-medium">
                        {metrics.payment_distribution.cash_percentage}%
                      </span>
                      <span className="text-sm text-neutral-500">
                        {formatCurrency(metrics.payment_distribution.cash_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Transfer</span>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-900 dark:text-white font-medium">
                        {metrics.payment_distribution.transfer_percentage}%
                      </span>
                      <span className="text-sm text-neutral-500">
                        {formatCurrency(metrics.payment_distribution.transfer_amount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Terminal</span>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-900 dark:text-white font-medium">
                        {metrics.payment_distribution.terminal_percentage}%
                      </span>
                      <span className="text-sm text-neutral-500">
                        {formatCurrency(metrics.payment_distribution.terminal_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Occupancy Insights */}
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Occupancy Summary
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h4 className="text-3xl font-bold text-neutral-900 dark:text-white">
                      {metrics.occupancy.occupancy_rate}%
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      Average Occupancy
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Total Check-ins</span>
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {metrics.occupancy.check_ins}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Cancellations</span>
                    <span className="text-danger-600 font-medium">
                      {metrics.occupancy.cancellations}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 dark:text-neutral-400">Avg Stay Duration</span>
                    <span className="text-neutral-900 dark:text-white font-medium">
                      {metrics.occupancy.average_length_of_stay.toFixed(1)} nights
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Room Type Breakdown */}
          {metrics.room_type_breakdown && metrics.room_type_breakdown.length > 0 && (
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Performance by Room Type
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-600 text-left">
                      <th className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Room Type
                      </th>
                      <th className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Bookings
                      </th>
                      <th className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Occupancy
                      </th>
                      <th className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        Avg Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.room_type_breakdown.map((room) => (
                      <tr
                        key={room.room_type}
                        className="border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white capitalize">
                          {room.room_type}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">
                          {formatCurrency(room.revenue)}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">
                          {room.bookings}
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">
                          {room.occupancy_rate}%
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white">
                          {formatCurrency(room.average_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Revenue Trend Chart */}
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 lg:col-span-2">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Revenue Trend
                </h3>
              </div>
              <div className="p-6">
                <RevenueTrendChart metrics={metrics} />
              </div>
            </div>

            {/* Room Performance Chart */}
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Room Performance
                </h3>
              </div>
              <div className="p-6">
                <RoomPerformanceChart metrics={metrics} />
              </div>
            </div>

            {/* Payment Distribution Chart */}
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Payment Methods Distribution
                </h3>
              </div>
              <div className="p-6">
                <PaymentDistributionChart metrics={metrics} />
              </div>
            </div>

            {/* Customer Demographics */}
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 lg:col-span-2">
              <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Customer Demographics
                </h3>
              </div>
              <div className="p-6">
                <CustomerDemographicsChart metrics={metrics} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading State */}
      {dashboardLoading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            Loading analytics data...
          </div>
        </div>
      )}
    </div>
  )
}