import {
  exportToExcel,
  exportToPdf,
  getCustomerAnalytics,
  getDashboardMetrics,
  getOccupancyDetails,
  getQuickStats,
  getRevenueDetails,
  getSeasonalTrends,
} from "@/api/analytics"
import { getRoomCategories, getRooms } from "@/api/rooms"
import { getCountries, getDistricts, getRegions } from "@/api/geo"
import type { AnalyticsExportRequest } from "@/client/types.gen"
import {
  PaymentDistributionChart,
  RevenueTrendChart,
  RoomPerformanceChart,
  SeasonalTrendsChart,
} from "@/components/analytics/AnalyticsCharts"
import type { GeoValue } from "@/components/ui/GeoSelect"
import { useAuth } from "@/contexts/AuthContext"
import { showError, showSuccess } from "@/utils/error-handling"
import { formatCurrency } from "@/utils/formatters"
import { useMutation, useQuery } from "@tanstack/react-query"
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns"
import {
  BarChart3,
  Bed,
  Calendar,
  Clock,
  DollarSign,
  Download,
  Heart,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react"
import { useState } from "react"

type AnalyticsTab =
  | "overview"
  | "revenue"
  | "occupancy"
  | "customers"
  | "trends"

export function Analytics() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview")

  // Default to current month
  const currentDate = new Date()
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(currentDate), "yyyy-MM-dd"),
    to: format(currentDate, "yyyy-MM-dd"), // Use today as end date, not end of month
  })

  // Room and category filters
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  // New filters: location, customer type, tags
  const [geoFilter, setGeoFilter] = useState<GeoValue>({
    country_code: null,
    region: null,
    district: null,
  })

  // For readable summary in the compact Location control
  const { data: countriesOptions = [] } = useQuery({
    queryKey: ["geo", "countries"],
    queryFn: getCountries,
    staleTime: 24 * 60 * 60 * 1000,
  })
  const { data: regionsOptions = [] } = useQuery({
    queryKey: ["geo", "regions", geoFilter.country_code],
    queryFn: () => getRegions(geoFilter.country_code || ""),
    enabled: !!geoFilter.country_code,
    staleTime: 24 * 60 * 60 * 1000,
  })
  const { data: districtsOptions = [] } = useQuery({
    queryKey: ["geo", "districts", geoFilter.region],
    queryFn: () => getDistricts(geoFilter.region || ""),
    enabled:
      geoFilter.country_code === "UZ" && geoFilter.region === "TASHKENT_CITY",
    staleTime: 24 * 60 * 60 * 1000,
  })
  const [customerType, setCustomerType] = useState<"" | "new" | "returning">("")
  const [tags, setTags] = useState<string[]>([])

  // Fetch rooms for filter dropdown
  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ limit: 100 }),
  })

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ["room-categories"],
    queryFn: () => getRoomCategories({ limit: 100 }),
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
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: [
      "analytics",
      "dashboard",
      dateRange,
      selectedRoomId,
      selectedCategoryId,
      geoFilter.country_code,
      geoFilter.region,
      geoFilter.district,
      customerType,
      tags,
    ],
    queryFn: () =>
      getDashboardMetrics({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        room_id: selectedRoomId !== "all" ? selectedRoomId : undefined,
        category_id:
          selectedCategoryId !== "all" ? selectedCategoryId : undefined,
        country_code: geoFilter.country_code || undefined,
        region: geoFilter.region || undefined,
        district: geoFilter.district || undefined,
        customer_type: customerType || undefined,
        tags: tags.length ? tags : undefined,
      }),
  })

  // Quick stats
  const { data: quickStatsData, isLoading: quickStatsLoading } = useQuery({
    queryKey: ["analytics", "quick-stats"],
    queryFn: () => getQuickStats(),
  })

  // Revenue details
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: [
      "analytics",
      "revenue",
      dateRange,
      selectedRoomId,
      selectedCategoryId,
      geoFilter.country_code,
      geoFilter.region,
      geoFilter.district,
      customerType,
      tags,
    ],
    queryFn: () =>
      getRevenueDetails({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        group_by: "day",
        room_id: selectedRoomId !== "all" ? selectedRoomId : undefined,
        category_id:
          selectedCategoryId !== "all" ? selectedCategoryId : undefined,
        country_code: geoFilter.country_code || undefined,
        region: geoFilter.region || undefined,
        district: geoFilter.district || undefined,
        customer_type: customerType || undefined,
        tags: tags.length ? tags : undefined,
      }),
    enabled: activeTab === "revenue",
  })

  // Occupancy details
  const { data: occupancyData, isLoading: occupancyLoading } = useQuery({
    queryKey: [
      "analytics",
      "occupancy",
      dateRange,
      selectedRoomId,
      selectedCategoryId,
      geoFilter.country_code,
      geoFilter.region,
      geoFilter.district,
      customerType,
      tags,
    ],
    queryFn: () =>
      getOccupancyDetails({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        room_id: selectedRoomId !== "all" ? selectedRoomId : undefined,
        category_id:
          selectedCategoryId !== "all" ? selectedCategoryId : undefined,
        country_code: geoFilter.country_code || undefined,
        region: geoFilter.region || undefined,
        district: geoFilter.district || undefined,
        customer_type: customerType || undefined,
        tags: tags.length ? tags : undefined,
      }),
    enabled: activeTab === "occupancy",
  })

  // Customer analytics
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: [
      "analytics",
      "customers",
      dateRange,
      geoFilter.country_code,
      geoFilter.region,
      geoFilter.district,
      customerType,
      tags,
    ],
    queryFn: () =>
      getCustomerAnalytics({
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        country_code: geoFilter.country_code || undefined,
        region: geoFilter.region || undefined,
        district: geoFilter.district || undefined,
        customer_type: customerType || undefined,
        tags: tags.length ? tags : undefined,
      }),
    enabled: activeTab === "customers",
  })

  // Seasonal trends
  const { data: seasonalTrendsData, isLoading: seasonalTrendsLoading } =
    useQuery({
      queryKey: ["analytics", "seasonal-trends"],
      queryFn: () => getSeasonalTrends(2),
      enabled: activeTab === "trends",
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
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        room_id: selectedRoomId !== "all" ? selectedRoomId : undefined,
        category_id:
          selectedCategoryId !== "all" ? selectedCategoryId : undefined,
        country_code: geoFilter.country_code || undefined,
        region: geoFilter.region || undefined,
        district: geoFilter.district || undefined,
        customer_type: customerType || undefined,
        tags: tags.length ? tags : undefined,
      },
      format: "pdf",
      include_charts: true,
    })
  }

  const handleExportExcel = () => {
    exportExcelMutation.mutate({
      filters: {
        date_from: `${dateRange.from}T00:00:00`,
        date_to: `${dateRange.to}T23:59:59`,
        room_id: selectedRoomId !== "all" ? selectedRoomId : undefined,
        category_id:
          selectedCategoryId !== "all" ? selectedCategoryId : undefined,
        country_code: geoFilter.country_code || undefined,
        region: geoFilter.region || undefined,
        district: geoFilter.district || undefined,
        customer_type: customerType || undefined,
        tags: tags.length ? tags : undefined,
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

  const setQuickDateRange = (
    type: "today" | "week" | "month" | "quarter" | "year",
  ) => {
    const now = new Date()
    let from: Date
    let to: Date = now

    switch (type) {
      case "today":
        from = now
        to = now
        break
      case "week":
        from = new Date(now)
        from.setDate(from.getDate() - 7)
        break
      case "month":
        from = startOfMonth(now)
        break
      case "quarter":
        from = startOfMonth(subMonths(now, 2))
        break
      case "year":
        from = startOfMonth(subMonths(now, 11))
        to = endOfMonth(now)
        break
    }

    setDateRange({
      from: format(from, "yyyy-MM-dd"),
      to: format(to, "yyyy-MM-dd"),
    })
  }

  const metrics = dashboardData?.data as any

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "occupancy", label: "Occupancy", icon: Bed },
    { id: "customers", label: "Customers", icon: Users },
    { id: "trends", label: "Trends", icon: TrendingUp },
  ] as const

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            metrics={metrics}
            quickStats={quickStatsData?.data}
            isLoading={dashboardLoading || quickStatsLoading}
          />
        )
      case "revenue":
        return (
          <RevenueTab data={revenueData?.data} isLoading={revenueLoading} />
        )
      case "occupancy":
        return (
          <OccupancyTab
            data={occupancyData?.data}
            isLoading={occupancyLoading}
          />
        )
      case "customers":
        return (
          <CustomersTab data={customerData?.data} isLoading={customerLoading} />
        )
      case "trends":
        return (
          <TrendsTab
            data={seasonalTrendsData?.data}
            isLoading={seasonalTrendsLoading}
          />
        )
      default:
        return (
          <OverviewTab
            metrics={metrics}
            quickStats={quickStatsData?.data}
            isLoading={dashboardLoading || quickStatsLoading}
          />
        )
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
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateChange("from", e.target.value)}
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setQuickDateRange("today")}
                className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
              >
                Today
              </button>
              <button
                onClick={() => setQuickDateRange("week")}
                className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setQuickDateRange("month")}
                className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
              >
                This Month
              </button>
              <button
                onClick={() => setQuickDateRange("quarter")}
                className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
              >
                Last 3 Months
              </button>
              <button
                onClick={() => setQuickDateRange("year")}
                className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
              >
                Last 12 Months
              </button>
            </div>
          </div>

          {/* Room and Category Filters */}
          <div className="flex flex-wrap items-end gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-600">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Room Category
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedCategoryId(val)
                  if (val !== "all") setSelectedRoomId("all")
                }}
                disabled={selectedRoomId !== "all"}
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Categories</option>
                {categoriesData?.data.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Specific Room
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedRoomId(val)
                  if (val !== "all") setSelectedCategoryId("all")
                }}
                disabled={selectedCategoryId !== "all"}
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Rooms</option>
                {roomsData?.data.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number} ({room.category?.name || "-"})
                  </option>
                ))}
              </select>
            </div>
            {/* Location filters are rendered in a dedicated row below */}
            {/* Customer type */}
            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Customer Type
              </label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All</option>
                <option value="new">New</option>
                <option value="returning">Returning</option>
              </select>
            </div>
            {/* Tags (comma-separated) */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Tags
              </label>
              <input
                value={tags.join(",")}
                onChange={(e) =>
                  setTags(
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="vip,loyal"
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-4 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={() => {
                setSelectedRoomId("all")
                setSelectedCategoryId("all")
                setGeoFilter({
                  country_code: null,
                  region: null,
                  district: null,
                })
                setCustomerType("")
                setTags([])
              }}
              className="rounded-lg py-2 px-4 inline-flex transition bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
            >
              Clear Filters
            </button>
          </div>
          <div className="mt-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg p-4 border border-neutral-200 dark:border-neutral-600">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Country */}
                <div className="min-w-[200px]">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                    Country
                  </label>
                  <select
                    value={geoFilter.country_code || ""}
                    onChange={(e) =>
                      setGeoFilter({
                        country_code: e.target.value || null,
                        region: null,
                        district: null,
                      })
                    }
                    className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All countries</option>
                    {countriesOptions.map((c: any) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Region (UZ only) */}
                {geoFilter.country_code === "UZ" && (
                  <div className="min-w-[200px]">
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                      Region (Uzbekistan)
                    </label>
                    <select
                      value={geoFilter.region || ""}
                      onChange={(e) =>
                        setGeoFilter({
                          ...geoFilter,
                          region: e.target.value || null,
                          district: null,
                        })
                      }
                      className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">All regions</option>
                      {regionsOptions.map((r: any) => (
                        <option key={r.code} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* District (Tashkent city) */}
                {geoFilter.country_code === "UZ" &&
                  geoFilter.region === "TASHKENT_CITY" && (
                    <div className="min-w-[200px]">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        District (Tashkent city)
                      </label>
                      <select
                        value={geoFilter.district || ""}
                        onChange={(e) =>
                          setGeoFilter({
                            ...geoFilter,
                            district: e.target.value || null,
                          })
                        }
                        className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white px-3 py-2 w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">All districts</option>
                        {districtsOptions.map((d: any) => (
                          <option key={d.code} value={d.code}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
              </div>
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
        <div className="p-6">{renderTabContent()}</div>
      </div>
    </div>
  )
}

// Tab Components
interface TabProps {
  isLoading?: boolean
}

interface OverviewTabProps extends TabProps {
  metrics?: any
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
        <p className="text-neutral-600 dark:text-neutral-400">
          No data available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      {quickStats && (
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Quick Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-600/10 to-white dark:from-blue-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Today
                  </p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(quickStats.today.revenue)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {quickStats.today.bookings} bookings
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-600/10 to-white dark:from-green-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    This Week
                  </p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(quickStats.week.revenue)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {quickStats.week.bookings} bookings
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-600/10 to-white dark:from-purple-600/20 dark:to-dark-1 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    This Month
                  </p>
                  <p className="text-xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(quickStats.month.revenue)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {quickStats.month.bookings} bookings
                  </p>
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
            {metrics.occupancy.average_length_of_stay.toFixed(1)} nights avg
            stay
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
              : "No cancellations"}
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
        <p className="text-neutral-600 dark:text-neutral-400">
          No revenue data available
        </p>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Revenue
              </p>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Bookings
              </p>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Nights
              </p>
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
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
                >
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    {point.date}
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(point.value)}
                  </span>
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
        <p className="text-neutral-600 dark:text-neutral-400">
          No occupancy data available
        </p>
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
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Occupancy Rate
            </p>
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
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Check-ins
            </p>
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
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Avg Stay (nights)
            </p>
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
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Cancellations
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Occupancy Details
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Total Available Room Nights
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.total_available_room_nights?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Total Occupied Room Nights
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.total_occupied_room_nights?.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Check-outs
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.check_outs}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Cancellation Rate
                </span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {data.check_ins > 0
                    ? (
                        (data.cancellations /
                          (data.check_ins + data.cancellations)) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
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
        <p className="text-neutral-600 dark:text-neutral-400">
          No customer data available
        </p>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Total Customers
              </p>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                New Customers
              </p>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Returning Customers
              </p>
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
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Age Distribution
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(data.age_distribution).map(
                ([ageGroup, count]) => (
                  <div
                    key={ageGroup}
                    className="flex justify-between items-center py-2"
                  >
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {ageGroup}
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {count as number}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* District Distribution */}
      {data.district_distribution &&
        Object.keys(data.district_distribution).length > 0 && (
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
            <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                District Distribution
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(data.district_distribution).map(
                  ([district, count]) => (
                    <div
                      key={district}
                      className="flex justify-between items-center py-2"
                    >
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {district}
                      </span>
                      <span className="font-semibold text-neutral-900 dark:text-white">
                        {count as number}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
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
        <p className="text-neutral-600 dark:text-neutral-400">
          No seasonal trends data available
        </p>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Peak Season
              </p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.peak_season || "N/A"}
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Highest Revenue Month
              </p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.highest_revenue_month || "N/A"}
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Best Occupancy Month
              </p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {data.highest_occupancy_month || "N/A"}
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
            Revenue, occupancy, and booking trends over the past{" "}
            {data.years_analyzed || 2} years
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
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Seasonal Insights
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(data.seasonal_insights).map(
                ([season, insights]: [string, any]) => (
                  <div key={season} className="space-y-3">
                    <h4 className="font-semibold text-neutral-900 dark:text-white capitalize">
                      {season}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Avg Revenue
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {formatCurrency(insights.avg_revenue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Avg Occupancy
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {insights.avg_occupancy?.toFixed(1) || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Avg Bookings
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {insights.avg_bookings || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Breakdown Table */}
      {data.monthly_data && data.monthly_data.length > 0 && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Monthly Performance Summary
            </h3>
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
                  <tr
                    key={index}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
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
