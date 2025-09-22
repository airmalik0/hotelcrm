import {
  exportToPdf,
  exportToExcel,
  getDashboardMetrics,
  getRevenueDetails,
  getOccupancyDetails,
  getCustomerAnalytics,
  getQuickStats,
  comparePeriods,
  getHourlyDistribution,
  getSeasonalTrends,
  getCustomerSegments,
  getCustomerLifetimeValue,
  getCustomerBehaviorPatterns,
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
  SeasonalTrendsChart,
  CustomerSegmentsChart,
  CustomerLtvChart,
  LtvTrendChart,
  BookingFrequencyChart,
  RoomPreferenceChart,
  BookingTimingChart,
  PeriodComparisonChart,
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
  Clock,
  TrendingDown,
  Target,
  Heart,
  Activity,
  Crown,
  Star,
  AlertTriangle,
  UserPlus,
} from "lucide-react"
import { useState } from "react"

type AnalyticsTab =
  | "overview"
  | "revenue"
  | "occupancy"
  | "customers"
  | "operations"
  | "trends"
  | "segments"
  | "ltv"
  | "behavior"
  | "compare"

export function Analytics() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview")

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

  // Quick stats
  const { data: quickStatsData, isLoading: quickStatsLoading } = useQuery({
    queryKey: ["analytics", "quick-stats"],
    queryFn: () => getQuickStats(),
  })

  // Revenue details
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["analytics", "revenue", dateRange],
    queryFn: () =>
      getRevenueDetails({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        group_by: "day",
      }),
    enabled: activeTab === "revenue",
  })

  // Occupancy details
  const { data: occupancyData, isLoading: occupancyLoading } = useQuery({
    queryKey: ["analytics", "occupancy", dateRange],
    queryFn: () =>
      getOccupancyDetails({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
      }),
    enabled: activeTab === "occupancy",
  })

  // Customer analytics
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ["analytics", "customers", dateRange],
    queryFn: () =>
      getCustomerAnalytics({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
      }),
    enabled: activeTab === "customers",
  })

  // Hourly distribution - check-ins
  const { data: hourlyCheckinsData, isLoading: hourlyCheckinsLoading } = useQuery({
    queryKey: ["analytics", "hourly-checkins", dateRange],
    queryFn: () =>
      getHourlyDistribution({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        metric: "check_ins",
      }),
    enabled: activeTab === "operations",
  })

  // Hourly distribution - check-outs
  const { data: hourlyCheckoutsData, isLoading: hourlyCheckoutsLoading } = useQuery({
    queryKey: ["analytics", "hourly-checkouts", dateRange],
    queryFn: () =>
      getHourlyDistribution({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        metric: "check_outs",
      }),
    enabled: activeTab === "operations",
  })

  // Seasonal trends
  const { data: seasonalTrendsData, isLoading: seasonalTrendsLoading } = useQuery({
    queryKey: ["analytics", "seasonal-trends"],
    queryFn: () => getSeasonalTrends(2),
    enabled: activeTab === "trends",
  })

  // Customer segments
  const { data: customerSegmentsData, isLoading: customerSegmentsLoading } = useQuery({
    queryKey: ["analytics", "customer-segments", dateRange],
    queryFn: () =>
      getCustomerSegments({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
      }),
    enabled: activeTab === "segments",
  })

  // Customer lifetime value
  const { data: customerLtvData, isLoading: customerLtvLoading } = useQuery({
    queryKey: ["analytics", "customer-ltv"],
    queryFn: () => getCustomerLifetimeValue(12),
    enabled: activeTab === "ltv",
  })

  // Customer behavior patterns
  const { data: behaviorPatternsData, isLoading: behaviorPatternsLoading } = useQuery({
    queryKey: ["analytics", "behavior-patterns", dateRange],
    queryFn: () =>
      getCustomerBehaviorPatterns({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
      }),
    enabled: activeTab === "behavior",
  })

  // PDF export mutation
  const exportPdfMutation = useMutation({
    mutationFn: (request: AnalyticsExportRequest) => exportToPdf(request),
    onSuccess: () => {
      showSuccess("PDF report exported successfully!")
    },
    onError: (error) => {
      showError(error, "Failed to export PDF report")
    },
  })

  // Excel export mutation
  const exportExcelMutation = useMutation({
    mutationFn: (request: AnalyticsExportRequest) => exportToExcel(request),
    onSuccess: () => {
      showSuccess("Excel report exported successfully!")
    },
    onError: (error) => {
      showError(error, "Failed to export Excel report")
    },
  })

  const handleExportPdf = () => {
    exportPdfMutation.mutate({
      filters: {
        date_from: new Date(`${dateRange.from}T00:00:00`),
        date_to: new Date(`${dateRange.to}T23:59:59`),
      },
      format: "pdf",
      include_charts: false,
    })
  }

  const handleExportExcel = () => {
    exportExcelMutation.mutate({
      filters: {
        date_from: new Date(`${dateRange.from}T00:00:00`),
        date_to: new Date(`${dateRange.to}T23:59:59`),
      },
      format: "excel",
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
        from = new Date(now)
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

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "occupancy", label: "Occupancy", icon: Bed },
    { id: "customers", label: "Customers", icon: Users },
    { id: "operations", label: "Operations", icon: Clock },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "segments", label: "Segments", icon: Target },
    { id: "ltv", label: "Lifetime Value", icon: Heart },
    { id: "behavior", label: "Behavior", icon: Activity },
    { id: "compare", label: "Compare", icon: TrendingDown },
  ] as const

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab metrics={metrics} quickStats={quickStatsData?.data} isLoading={dashboardLoading || quickStatsLoading} />
      case "revenue":
        return <RevenueTab data={revenueData?.data} isLoading={revenueLoading} />
      case "occupancy":
        return <OccupancyTab data={occupancyData?.data} isLoading={occupancyLoading} />
      case "customers":
        return <CustomersTab data={customerData?.data} isLoading={customerLoading} />
      case "operations":
        return <OperationsTab checkins={hourlyCheckinsData?.data} checkouts={hourlyCheckoutsData?.data} isLoading={hourlyCheckinsLoading || hourlyCheckoutsLoading} />
      case "trends":
        return <TrendsTab data={seasonalTrendsData?.data} isLoading={seasonalTrendsLoading} />
      case "segments":
        return <SegmentsTab data={customerSegmentsData?.data} isLoading={customerSegmentsLoading} />
      case "ltv":
        return <LtvTab data={customerLtvData?.data} isLoading={customerLtvLoading} />
      case "behavior":
        return <BehaviorTab data={behaviorPatternsData?.data} isLoading={behaviorPatternsLoading} />
      case "compare":
        return <CompareTab dateRange={dateRange} />
      default:
        return <OverviewTab metrics={metrics} quickStats={quickStatsData?.data} isLoading={dashboardLoading || quickStatsLoading} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Comprehensive business intelligence and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPdf}
            disabled={exportPdfMutation.isPending || !metrics}
            className="rounded-lg py-2 px-4 inline-flex items-center gap-2 transition bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportExcelMutation.isPending || !metrics}
            className="rounded-lg py-2 px-4 inline-flex items-center gap-2 transition bg-success-600 text-white hover:bg-success-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export Excel
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

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600">
          <div className="flex flex-wrap overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AnalyticsTab)}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-primary-600 text-primary-600 dark:text-primary-400"
                      : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-500"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

// Tab Components
interface TabProps {
  isLoading?: boolean
}

interface OverviewTabProps extends TabProps {
  metrics?: DashboardMetrics
  quickStats?: any
}

function OverviewTab({ metrics, quickStats, isLoading }: OverviewTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading overview data...
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      {quickStats && (
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Quick Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600/10 to-white dark:from-blue-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Today</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">{formatCurrency(quickStats.today.revenue)}</p>
                  <p className="text-xs text-neutral-500">{quickStats.today.bookings} bookings</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-600/10 to-white dark:from-green-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">This Week</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">{formatCurrency(quickStats.week.revenue)}</p>
                  <p className="text-xs text-neutral-500">{quickStats.week.bookings} bookings</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-600/10 to-white dark:from-purple-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">This Month</p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">{formatCurrency(quickStats.month.revenue)}</p>
                  <p className="text-xs text-neutral-500">{quickStats.month.bookings} bookings</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main KPI Cards for Selected Period */}
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  )
}

interface RevenueTabProps extends TabProps {
  data?: any
}

function RevenueTab({ data, isLoading }: RevenueTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading revenue data...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No revenue data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Revenue</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(data.metrics?.total_revenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Bookings</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.metrics?.booking_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Nights</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.metrics?.total_nights || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend */}
      {data.trend && data.trend.length > 0 && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Revenue Trend ({data.group_by})
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {data.trend.map((point: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{point.date}</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{formatCurrency(point.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface OccupancyTabProps extends TabProps {
  data?: any
}

function OccupancyTab({ data, isLoading }: OccupancyTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading occupancy data...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No occupancy data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Bed className="w-8 h-8" />
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
              {data.occupancy_rate}%
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Occupancy Rate</p>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8" />
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
              {data.check_ins}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Check-ins</p>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
              {data.average_length_of_stay?.toFixed(1)}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Avg Stay (nights)</p>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white mb-1">
              {data.cancellations}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Cancellations</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Occupancy Details</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">Total Available Room Nights</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{data.total_available_room_nights?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">Total Occupied Room Nights</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{data.total_occupied_room_nights?.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">Check-outs</span>
                <span className="font-semibold text-neutral-900 dark:text-white">{data.check_outs}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">Cancellation Rate</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.check_ins > 0 ? ((data.cancellations / (data.check_ins + data.cancellations)) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CustomersTabProps extends TabProps {
  data?: any
}

function CustomersTab({ data, isLoading }: CustomersTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading customer data...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No customer data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Customers</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.total_customers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">New Customers</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.new_customers}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Returning Customers</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.returning_customers}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Age Distribution */}
      {data.age_distribution && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Age Distribution</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(data.age_distribution).map(([ageGroup, count]) => (
                <div key={ageGroup} className="flex justify-between items-center py-2">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{ageGroup}</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* District Distribution */}
      {data.district_distribution && Object.keys(data.district_distribution).length > 0 && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">District Distribution</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(data.district_distribution).map(([district, count]) => (
                <div key={district} className="flex justify-between items-center py-2">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{district}</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface OperationsTabProps extends TabProps {
  checkins?: any
  checkouts?: any
}

function OperationsTab({ checkins, checkouts, isLoading }: OperationsTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading operational data...
        </div>
      </div>
    )
  }

  if (!checkins && !checkouts) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No operational data available</p>
      </div>
    )
  }

  const checkinsData = checkins?.hourly_data || []
  const checkoutsData = checkouts?.hourly_data || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Check-ins Distribution */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Check-ins by Hour</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {checkinsData.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {item.label || `${item.hour?.toString().padStart(2, '0')}:00`}
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Check-outs Distribution */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Check-outs by Hour</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {checkoutsData.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {item.label || `${item.hour?.toString().padStart(2, '0')}:00`}
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Operational Summary</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                {checkinsData.reduce((sum: number, item: any) => sum + item.count, 0)}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Check-ins</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                {checkoutsData.reduce((sum: number, item: any) => sum + item.count, 0)}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Check-outs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                {checkinsData.length > 0 ? checkinsData.reduce((max: any, item: any) => item.count > max.count ? item : max, checkinsData[0])?.label : 'N/A'}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Peak Check-in Hour</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                {checkoutsData.length > 0 ? checkoutsData.reduce((max: any, item: any) => item.count > max.count ? item : max, checkoutsData[0])?.label : 'N/A'}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Peak Check-out Hour</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Placeholder components for the remaining tabs
interface TrendsTabProps extends TabProps {
  data?: any
}

function TrendsTab({ data, isLoading }: TrendsTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading seasonal trends...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No seasonal trends data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Peak Season</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.peak_season || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 text-white rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Highest Revenue Month</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.highest_revenue_month || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Best Occupancy Month</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.highest_occupancy_month || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seasonal Trends Chart */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Multi-Year Seasonal Analysis
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Revenue, occupancy, and booking trends over the past {data.years_analyzed || 2} years
          </p>
        </div>
        <div className="p-6">
          <SeasonalTrendsChart data={data} />
        </div>
      </div>

      {/* Seasonal Insights */}
      {data.seasonal_insights && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Seasonal Insights</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(data.seasonal_insights).map(([season, insights]: [string, any]) => (
                <div key={season} className="space-y-3">
                  <h4 className="font-semibold text-neutral-900 dark:text-white capitalize">{season}</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Avg Revenue</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(insights.avg_revenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Avg Occupancy</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {insights.avg_occupancy?.toFixed(1) || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Avg Bookings</span>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {insights.avg_bookings || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Breakdown Table */}
      {data.monthly_data && data.monthly_data.length > 0 && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Monthly Performance Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Occupancy Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-600">
                {data.monthly_data.map((month: any, index: number) => (
                  <tr key={index} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-white">
                      {month.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(month.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {month.bookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {month.occupancy_rate?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

interface SegmentsTabProps extends TabProps {
  data?: any
}

function SegmentsTab({ data, isLoading }: SegmentsTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading customer segments...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No customer segments data available</p>
      </div>
    )
  }

  // Segment configuration with icons and colors
  const segmentConfig = {
    vip: {
      icon: Crown,
      color: "from-yellow-600/10 to-white dark:from-yellow-600/20 dark:to-dark-1",
      iconColor: "text-yellow-600",
      bgColor: "bg-yellow-600"
    },
    loyal: {
      icon: Star,
      color: "from-blue-600/10 to-white dark:from-blue-600/20 dark:to-dark-1",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-600"
    },
    new: {
      icon: UserPlus,
      color: "from-green-600/10 to-white dark:from-green-600/20 dark:to-dark-1",
      iconColor: "text-green-600",
      bgColor: "bg-green-600"
    },
    at_risk: {
      icon: AlertTriangle,
      color: "from-red-600/10 to-white dark:from-red-600/20 dark:to-dark-1",
      iconColor: "text-red-600",
      bgColor: "bg-red-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Segments Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.segments && Object.entries(data.segments).map(([segment, info]: [string, any]) => {
          const config = segmentConfig[segment as keyof typeof segmentConfig]
          if (!config) return null

          const Icon = config.icon

          return (
            <div key={segment} className={`bg-gradient-to-br ${config.color} rounded-lg border border-neutral-200 dark:border-neutral-600 p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${config.bgColor} text-white rounded-full flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {info.count}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {info.percentage?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 dark:text-white capitalize mb-2">
                  {segment.replace('_', ' ')} Customers
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Revenue: {formatCurrency(info.total_revenue)}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Avg: {formatCurrency(info.avg_revenue_per_customer)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Segments Distribution Chart */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Customer Segments Distribution
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Breakdown of customers by segment type
          </p>
        </div>
        <div className="p-6">
          <CustomerSegmentsChart data={data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segment Revenue Comparison */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Revenue by Segment</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.segments && Object.entries(data.segments)
                .sort(([,a], [,b]) => (b as any).total_revenue - (a as any).total_revenue)
                .map(([segment, info]: [string, any]) => {
                  const config = segmentConfig[segment as keyof typeof segmentConfig]
                  if (!config) return null

                  const maxRevenue = Math.max(...Object.values(data.segments).map((s: any) => s.total_revenue))
                  const percentage = (info.total_revenue / maxRevenue) * 100

                  return (
                    <div key={segment} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 capitalize">
                          {segment.replace('_', ' ')} Customers
                        </span>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {formatCurrency(info.total_revenue)}
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${config.bgColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* Segment Details Table */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Segment Details</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.segments && Object.entries(data.segments).map(([segment, info]: [string, any]) => {
                const config = segmentConfig[segment as keyof typeof segmentConfig]
                if (!config) return null

                return (
                  <div key={segment} className="border-b border-neutral-100 dark:border-neutral-700 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 ${config.bgColor} text-white rounded-lg flex items-center justify-center`}>
                        <config.icon className="w-4 h-4" />
                      </div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white capitalize">
                        {segment.replace('_', ' ')} Customers
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Count:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{info.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Share:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{info.percentage?.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Total Revenue:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(info.total_revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Avg per Customer:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(info.avg_revenue_per_customer)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Segment Criteria */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Segmentation Criteria</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            How customers are categorized into different segments
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">VIP Customers</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    High-value customers with significant spending history and frequent bookings
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Loyal Customers</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Regular customers with multiple bookings and consistent engagement
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserPlus className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">New Customers</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Recent customers with limited booking history but growth potential
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">At-Risk Customers</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Previously active customers who haven't booked recently and may churn
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface LtvTabProps extends TabProps {
  data?: any
}

function LtvTab({ data, isLoading }: LtvTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading LTV data...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No LTV data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* LTV Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-600/10 to-white dark:from-green-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(data.overall_avg_ltv || 0)}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Average LTV
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/10 to-white dark:from-blue-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(data.highest_ltv || 0)}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Highest LTV
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/10 to-white dark:from-purple-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.total_customers || 0}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Customers
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600/10 to-white dark:from-orange-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(data.total_lifetime_value || 0)}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Total LTV
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LTV Distribution Chart */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              LTV Distribution
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Customer distribution across LTV ranges
            </p>
          </div>
          <div className="p-6">
            <CustomerLtvChart data={data} />
          </div>
        </div>

        {/* LTV Segments Breakdown */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">LTV Segments</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.ltv_segments && Object.entries(data.ltv_segments).map(([segment, info]: [string, any]) => {
                const segmentColors = {
                  high: { bg: 'bg-green-600', color: 'from-green-600/10 to-white dark:from-green-600/20 dark:to-dark-1' },
                  medium: { bg: 'bg-blue-600', color: 'from-blue-600/10 to-white dark:from-blue-600/20 dark:to-dark-1' },
                  low: { bg: 'bg-yellow-600', color: 'from-yellow-600/10 to-white dark:from-yellow-600/20 dark:to-dark-1' },
                  very_low: { bg: 'bg-red-600', color: 'from-red-600/10 to-white dark:from-red-600/20 dark:to-dark-1' }
                }
                const config = segmentColors[segment as keyof typeof segmentColors]

                return (
                  <div key={segment} className={`bg-gradient-to-br ${config?.color} rounded-lg border border-neutral-200 dark:border-neutral-600 p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${config?.bg} text-white rounded-lg flex items-center justify-center`}>
                          <Heart className="w-4 h-4" />
                        </div>
                        <h4 className="font-semibold text-neutral-900 dark:text-white capitalize">
                          {segment.replace('_', ' ')} LTV
                        </h4>
                      </div>
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        {info.count} customers
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Range:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{info.range}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Avg LTV:</span>
                        <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(info.avg_ltv)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* LTV Trend Over Time */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            LTV Trend Analysis
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Customer lifetime value trends over the past {data.months_analyzed || 12} months
          </p>
        </div>
        <div className="p-6">
          <LtvTrendChart data={data} />
        </div>
      </div>

      {/* Top LTV Customers */}
      {data.top_ltv_customers && data.top_ltv_customers.length > 0 && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Top LTV Customers</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Highest value customers by lifetime revenue
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-neutral-50 dark:bg-neutral-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Lifetime Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Total Bookings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    First Booking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Last Booking
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-600">
                {data.top_ltv_customers.map((customer: any, index: number) => (
                  <tr key={index} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-neutral-500'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-white">
                      {customer.customer_name || `Customer #${customer.customer_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(customer.lifetime_value)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {customer.total_bookings}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {customer.first_booking_date ? format(new Date(customer.first_booking_date), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                      {customer.last_booking_date ? format(new Date(customer.last_booking_date), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LTV Insights */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">LTV Insights & Recommendations</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">High LTV Customers</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Focus on retention strategies and personalized experiences for your most valuable customers
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Customer Development</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Identify patterns in high-LTV customers to develop similar value in medium-LTV segments
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-600 text-white rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Growth Opportunities</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Target low-LTV customers with engagement campaigns to increase their lifetime value
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Loyalty Programs</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Implement loyalty rewards to encourage repeat bookings and increase customer lifetime value
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BehaviorTabProps extends TabProps {
  data?: any
}

function BehaviorTab({ data, isLoading }: BehaviorTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          Loading behavior patterns...
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">No behavior patterns data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Behavior Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600/10 to-white dark:from-blue-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.avg_booking_frequency?.toFixed(1) || 0}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Avg Booking Frequency
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/10 to-white dark:from-green-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.avg_days_in_advance?.toFixed(0) || 0}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Avg Days in Advance
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/10 to-white dark:from-purple-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center">
              <Bed className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.most_preferred_room_type || 'N/A'}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Most Preferred Room
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600/10 to-white dark:from-orange-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {data.avg_stay_duration?.toFixed(1) || 0}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Avg Stay Duration
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Frequency Distribution */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Booking Frequency Distribution
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              How often customers make bookings
            </p>
          </div>
          <div className="p-6">
            <BookingFrequencyChart data={data} />
          </div>
        </div>

        {/* Room Preference Patterns */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Room Type Preferences
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Customer preferences by room type
            </p>
          </div>
          <div className="p-6">
            <RoomPreferenceChart data={data} />
          </div>
        </div>
      </div>

      {/* Booking Timing Patterns */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Booking Advance Planning Patterns
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            How far in advance customers typically book
          </p>
        </div>
        <div className="p-6">
          <BookingTimingChart data={data} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stay Duration Patterns */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Stay Duration Analysis</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {data.stay_duration_patterns && Object.entries(data.stay_duration_patterns).map(([duration, count]: [string, any]) => (
                <div key={duration} className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">{duration}</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{count} customers</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Repeat Customer Behavior */}
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Repeat Customer Insights</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Return Rate</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.repeat_customer_rate?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Avg Time Between Visits</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.avg_time_between_visits || 0} days
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Most Loyal Customer</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.most_visits_count || 0} visits
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Average Customer Lifespan</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.avg_customer_lifespan || 0} months
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Behavior Patterns */}
      {data.cancellation_patterns && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Cancellation Behavior</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Understanding when and why customers cancel bookings
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                  {data.cancellation_patterns.cancellation_rate?.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Cancellation Rate</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                  {data.cancellation_patterns.avg_days_before_cancellation || 0}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Avg Days Before Cancel</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingDown className="w-8 h-8" />
                </div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                  {data.cancellation_patterns.most_common_reason || 'N/A'}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Most Common Reason</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Behavioral Insights & Recommendations */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Behavioral Insights & Recommendations</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Booking Patterns</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Analyze peak booking times to optimize marketing campaigns and pricing strategies
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Customer Retention</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Focus on improving repeat customer experience based on identified behavioral patterns
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                  <Bed className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Room Optimization</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Adjust inventory and pricing based on room preference patterns and demand
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">Advance Booking Strategy</h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Implement early bird discounts or last-minute deals based on booking timing patterns
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CompareTabProps {
  dateRange: { from: string; to: string }
}

function CompareTab({ dateRange }: CompareTabProps) {
  const [period1, setPeriod1] = useState({
    from: format(subMonths(new Date(), 2), "yyyy-MM-dd"),
    to: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
  })

  const [period2, setPeriod2] = useState({
    from: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  })

  // Comparison query
  const { data: comparisonData, isLoading: comparisonLoading, refetch: compareData } = useQuery({
    queryKey: ["analytics", "compare", period1, period2],
    queryFn: () =>
      comparePeriods({
        period1_from: `${period1.from}T00:00:00`,
        period1_to: `${period1.to}T23:59:59`,
        period2_from: `${period2.from}T00:00:00`,
        period2_to: `${period2.to}T23:59:59`,
      }),
    enabled: false, // Only run when manually triggered
  })

  const handleCompare = () => {
    compareData()
  }

  const setQuickComparison = (type: 'month' | 'quarter' | 'year' | 'lastWeekThisWeek') => {
    const now = new Date()
    let p1From: Date, p1To: Date, p2From: Date, p2To: Date

    switch(type) {
      case 'month':
        // Last month vs this month
        p1From = startOfMonth(subMonths(now, 1))
        p1To = endOfMonth(subMonths(now, 1))
        p2From = startOfMonth(now)
        p2To = now
        break
      case 'quarter':
        // Last quarter vs this quarter
        p1From = startOfMonth(subMonths(now, 5))
        p1To = endOfMonth(subMonths(now, 3))
        p2From = startOfMonth(subMonths(now, 2))
        p2To = now
        break
      case 'year':
        // Last year vs this year
        p1From = new Date(now.getFullYear() - 1, 0, 1)
        p1To = new Date(now.getFullYear() - 1, 11, 31)
        p2From = new Date(now.getFullYear(), 0, 1)
        p2To = now
        break
      case 'lastWeekThisWeek':
        // Last week vs this week
        p1From = new Date(now)
        p1From.setDate(p1From.getDate() - 14)
        p1To = new Date(now)
        p1To.setDate(p1To.getDate() - 7)
        p2From = new Date(now)
        p2From.setDate(p2From.getDate() - 7)
        p2To = now
        break
    }

    setPeriod1({
      from: format(p1From, "yyyy-MM-dd"),
      to: format(p1To, "yyyy-MM-dd"),
    })
    setPeriod2({
      from: format(p2From, "yyyy-MM-dd"),
      to: format(p2To, "yyyy-MM-dd"),
    })
  }

  const calculatePercentageChange = (oldValue: number, newValue: number) => {
    if (oldValue === 0) return newValue > 0 ? 100 : 0
    return ((newValue - oldValue) / oldValue) * 100
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600"
    if (change < 0) return "text-red-600"
    return "text-neutral-600 dark:text-neutral-400"
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    if (change < 0) return <TrendingDown className="w-4 h-4" />
    return null
  }

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Select Periods to Compare
        </h3>

        {/* Quick Comparisons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setQuickComparison('lastWeekThisWeek')}
            className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
          >
            Last Week vs This Week
          </button>
          <button
            onClick={() => setQuickComparison('month')}
            className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
          >
            Last Month vs This Month
          </button>
          <button
            onClick={() => setQuickComparison('quarter')}
            className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
          >
            Last Quarter vs This Quarter
          </button>
          <button
            onClick={() => setQuickComparison('year')}
            className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
          >
            Last Year vs This Year
          </button>
        </div>

        {/* Custom Date Ranges */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Period 1 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-neutral-900 dark:text-white">Period 1</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={period1.from}
                  onChange={(e) => setPeriod1(prev => ({ ...prev, from: e.target.value }))}
                  className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={period1.to}
                  onChange={(e) => setPeriod1(prev => ({ ...prev, to: e.target.value }))}
                  className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Period 2 */}
          <div className="space-y-4">
            <h4 className="font-semibold text-neutral-900 dark:text-white">Period 2</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={period2.from}
                  onChange={(e) => setPeriod2(prev => ({ ...prev, from: e.target.value }))}
                  className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={period2.to}
                  onChange={(e) => setPeriod2(prev => ({ ...prev, to: e.target.value }))}
                  className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Compare Button */}
        <div className="mt-6">
          <button
            onClick={handleCompare}
            disabled={comparisonLoading}
            className="rounded-lg py-3 px-6 inline-flex items-center gap-2 transition bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {comparisonLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            Compare Periods
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <>
          {/* Key Metrics Comparison */}
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
            <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Performance Comparison
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Period 1: {period1.from} to {period1.to} vs Period 2: {period2.from} to {period2.to}
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revenue Comparison */}
                <div className="text-center">
                  <div className="space-y-2">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Revenue</div>
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(comparisonData.period1?.total_revenue || 0)}
                    </div>
                    <div className="text-xs text-neutral-500">Period 1</div>
                  </div>
                  <div className="my-3 border-b border-neutral-200 dark:border-neutral-600"></div>
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {formatCurrency(comparisonData.period2?.total_revenue || 0)}
                    </div>
                    <div className="text-xs text-neutral-500">Period 2</div>
                    <div className={`flex items-center justify-center gap-1 text-sm ${getChangeColor(
                      calculatePercentageChange(
                        comparisonData.period1?.total_revenue || 0,
                        comparisonData.period2?.total_revenue || 0
                      )
                    )}`}>
                      {getChangeIcon(
                        calculatePercentageChange(
                          comparisonData.period1?.total_revenue || 0,
                          comparisonData.period2?.total_revenue || 0
                        )
                      )}
                      {Math.abs(
                        calculatePercentageChange(
                          comparisonData.period1?.total_revenue || 0,
                          comparisonData.period2?.total_revenue || 0
                        )
                      ).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Bookings Comparison */}
                <div className="text-center">
                  <div className="space-y-2">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Bookings</div>
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {comparisonData.period1?.total_bookings || 0}
                    </div>
                    <div className="text-xs text-neutral-500">Period 1</div>
                  </div>
                  <div className="my-3 border-b border-neutral-200 dark:border-neutral-600"></div>
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {comparisonData.period2?.total_bookings || 0}
                    </div>
                    <div className="text-xs text-neutral-500">Period 2</div>
                    <div className={`flex items-center justify-center gap-1 text-sm ${getChangeColor(
                      calculatePercentageChange(
                        comparisonData.period1?.total_bookings || 0,
                        comparisonData.period2?.total_bookings || 0
                      )
                    )}`}>
                      {getChangeIcon(
                        calculatePercentageChange(
                          comparisonData.period1?.total_bookings || 0,
                          comparisonData.period2?.total_bookings || 0
                        )
                      )}
                      {Math.abs(
                        calculatePercentageChange(
                          comparisonData.period1?.total_bookings || 0,
                          comparisonData.period2?.total_bookings || 0
                        )
                      ).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Occupancy Comparison */}
                <div className="text-center">
                  <div className="space-y-2">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Occupancy Rate</div>
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {comparisonData.period1?.occupancy_rate?.toFixed(1) || 0}%
                    </div>
                    <div className="text-xs text-neutral-500">Period 1</div>
                  </div>
                  <div className="my-3 border-b border-neutral-200 dark:border-neutral-600"></div>
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {comparisonData.period2?.occupancy_rate?.toFixed(1) || 0}%
                    </div>
                    <div className="text-xs text-neutral-500">Period 2</div>
                    <div className={`flex items-center justify-center gap-1 text-sm ${getChangeColor(
                      calculatePercentageChange(
                        comparisonData.period1?.occupancy_rate || 0,
                        comparisonData.period2?.occupancy_rate || 0
                      )
                    )}`}>
                      {getChangeIcon(
                        calculatePercentageChange(
                          comparisonData.period1?.occupancy_rate || 0,
                          comparisonData.period2?.occupancy_rate || 0
                        )
                      )}
                      {Math.abs(
                        calculatePercentageChange(
                          comparisonData.period1?.occupancy_rate || 0,
                          comparisonData.period2?.occupancy_rate || 0
                        )
                      ).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Average Stay Length Comparison */}
                <div className="text-center">
                  <div className="space-y-2">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Avg Stay Length</div>
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {comparisonData.period1?.avg_stay_length?.toFixed(1) || 0}
                    </div>
                    <div className="text-xs text-neutral-500">Period 1</div>
                  </div>
                  <div className="my-3 border-b border-neutral-200 dark:border-neutral-600"></div>
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-neutral-900 dark:text-white">
                      {comparisonData.period2?.avg_stay_length?.toFixed(1) || 0}
                    </div>
                    <div className="text-xs text-neutral-500">Period 2</div>
                    <div className={`flex items-center justify-center gap-1 text-sm ${getChangeColor(
                      calculatePercentageChange(
                        comparisonData.period1?.avg_stay_length || 0,
                        comparisonData.period2?.avg_stay_length || 0
                      )
                    )}`}>
                      {getChangeIcon(
                        calculatePercentageChange(
                          comparisonData.period1?.avg_stay_length || 0,
                          comparisonData.period2?.avg_stay_length || 0
                        )
                      )}
                      {Math.abs(
                        calculatePercentageChange(
                          comparisonData.period1?.avg_stay_length || 0,
                          comparisonData.period2?.avg_stay_length || 0
                        )
                      ).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Chart */}
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
            <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Trends Comparison
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Revenue and booking trends for both periods
              </p>
            </div>
            <div className="p-6">
              <PeriodComparisonChart data={comparisonData} />
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
            <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Comparison Insights</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${
                      (comparisonData.period2?.total_revenue || 0) > (comparisonData.period1?.total_revenue || 0)
                        ? 'bg-green-600' : 'bg-red-600'
                    } text-white rounded-lg flex items-center justify-center`}>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white">Revenue Performance</h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Period 2 generated {Math.abs(
                          calculatePercentageChange(
                            comparisonData.period1?.total_revenue || 0,
                            comparisonData.period2?.total_revenue || 0
                          )
                        ).toFixed(1)}%
                        {(comparisonData.period2?.total_revenue || 0) > (comparisonData.period1?.total_revenue || 0)
                          ? ' more' : ' less'} revenue than Period 1
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${
                      (comparisonData.period2?.total_bookings || 0) > (comparisonData.period1?.total_bookings || 0)
                        ? 'bg-green-600' : 'bg-red-600'
                    } text-white rounded-lg flex items-center justify-center`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white">Booking Volume</h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Period 2 had {Math.abs(
                          calculatePercentageChange(
                            comparisonData.period1?.total_bookings || 0,
                            comparisonData.period2?.total_bookings || 0
                          )
                        ).toFixed(1)}%
                        {(comparisonData.period2?.total_bookings || 0) > (comparisonData.period1?.total_bookings || 0)
                          ? ' more' : ' fewer'} bookings than Period 1
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 ${
                      (comparisonData.period2?.occupancy_rate || 0) > (comparisonData.period1?.occupancy_rate || 0)
                        ? 'bg-green-600' : 'bg-red-600'
                    } text-white rounded-lg flex items-center justify-center`}>
                      <Bed className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white">Occupancy Efficiency</h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Occupancy rate was {Math.abs(
                          calculatePercentageChange(
                            comparisonData.period1?.occupancy_rate || 0,
                            comparisonData.period2?.occupancy_rate || 0
                          )
                        ).toFixed(1)}%
                        {(comparisonData.period2?.occupancy_rate || 0) > (comparisonData.period1?.occupancy_rate || 0)
                          ? ' higher' : ' lower'} in Period 2
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 dark:text-white">Overall Trend</h4>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {(comparisonData.period2?.total_revenue || 0) > (comparisonData.period1?.total_revenue || 0)
                          ? 'Positive growth trend observed across key metrics'
                          : 'Decline in key metrics - consider seasonal factors or market changes'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* No Data State */}
      {!comparisonData && !comparisonLoading && (
        <div className="text-center py-12">
          <TrendingDown className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            Ready to Compare Periods
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400">
            Select your periods above and click "Compare Periods" to see detailed analytics comparison
          </p>
        </div>
      )}
    </div>
  )
}