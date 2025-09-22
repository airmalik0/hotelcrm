import type {
  AnalyticsExportRequest,
  AnalyticsResponse,
  ComparisonMetrics,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

interface AnalyticsParams {
  date_from: string
  date_to: string
  room_id?: string
  room_type?: string
  district?: string
  include_cancelled?: boolean
  group_by?: string
}

export async function getDashboardMetrics(params: AnalyticsParams) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/dashboard",
    {
      params,
    },
  )
  return data
}

export async function getRevenueDetails(params: AnalyticsParams) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/revenue",
    {
      params,
    },
  )
  return data
}

export async function getOccupancyDetails(params: AnalyticsParams) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/occupancy",
    {
      params,
    },
  )
  return data
}

export async function getCustomerAnalytics(params: AnalyticsParams) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/customers",
    {
      params,
    },
  )
  return data
}

export async function getQuickStats() {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/quick-stats",
  )
  return data
}

export async function comparePeriods(params: {
  period1_from: string
  period1_to: string
  period2_from: string
  period2_to: string
  room_id?: string
  room_type?: string
}) {
  const { data } = await apiClient.get<ComparisonMetrics>(
    "/api/v1/analytics/compare",
    {
      params,
    },
  )
  return data
}

export async function exportToPdf(request: AnalyticsExportRequest) {
  const response = await apiClient.post(
    "/api/v1/analytics/export/pdf",
    request,
    {
      responseType: "blob",
    },
  )

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement("a")
  link.href = url
  link.setAttribute(
    "download",
    `analytics_report_${new Date().toISOString().split("T")[0]}.pdf`,
  )
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function exportToExcel(request: AnalyticsExportRequest) {
  const response = await apiClient.post(
    "/api/v1/analytics/export/excel",
    request,
    {
      responseType: "blob",
    },
  )

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement("a")
  link.href = url
  link.setAttribute(
    "download",
    `analytics_report_${new Date().toISOString().split("T")[0]}.xlsx`,
  )
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function getHourlyDistribution(params: {
  date_from: string
  date_to: string
  metric: "check_ins" | "check_outs"
}) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/hourly-distribution",
    {
      params,
    },
  )
  return data
}

export async function getSeasonalTrends(years = 2) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/seasonal-trends",
    {
      params: { years },
    },
  )
  return data
}

export async function getCustomerSegments(params?: {
  date_from?: string
  date_to?: string
}) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/customer-segments",
    {
      params,
    },
  )
  return data
}

export async function getCustomerLifetimeValue(months_back = 12) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/customer-lifetime",
    {
      params: { months_back },
    },
  )
  return data
}

export async function getCustomerBehaviorPatterns(params?: {
  date_from?: string
  date_to?: string
}) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/customer-behavior",
    {
      params,
    },
  )
  return data
}
