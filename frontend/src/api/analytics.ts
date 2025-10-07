import type {
  AnalyticsExportRequest,
  AnalyticsResponse,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

interface AnalyticsParams {
  date_from: string
  date_to: string
  room_id?: string
  category_id?: string
  country_code?: string
  region?: string
  district?: string
  include_cancelled?: boolean
  group_by?: string
  customer_type?: 'new' | 'returning'
  tags?: string[]
}

export async function getDashboardMetrics(params: AnalyticsParams) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/dashboard",
    {
      params,
      paramsSerializer: {
        serialize: (p: Record<string, any>) => {
          const usp = new URLSearchParams()
          Object.entries(p).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return
            if (Array.isArray(value)) {
              value.forEach((v) => usp.append(key, String(v)))
            } else {
              usp.append(key, String(value))
            }
          })
          return usp.toString()
        },
      },
    },
  )
  return data
}

export async function getRevenueDetails(params: AnalyticsParams) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/revenue_details",
    {
      params,
      paramsSerializer: {
        serialize: (p: Record<string, any>) => {
          const usp = new URLSearchParams()
          Object.entries(p).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return
            if (Array.isArray(value)) {
              value.forEach((v) => usp.append(key, String(v)))
            } else {
              usp.append(key, String(value))
            }
          })
          return usp.toString()
        },
      },
    },
  )
  return data
}

export async function getOccupancyDetails(params: AnalyticsParams) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/occupancy_details",
    {
      params,
      paramsSerializer: {
        serialize: (p: Record<string, any>) => {
          const usp = new URLSearchParams()
          Object.entries(p).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return
            if (Array.isArray(value)) {
              value.forEach((v) => usp.append(key, String(v)))
            } else {
              usp.append(key, String(value))
            }
          })
          return usp.toString()
        },
      },
    },
  )
  return data
}

export async function getCustomerAnalytics(params: AnalyticsParams) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/customer_details",
    {
      params,
      paramsSerializer: {
        serialize: (p: Record<string, any>) => {
          const usp = new URLSearchParams()
          Object.entries(p).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return
            if (Array.isArray(value)) {
              value.forEach((v) => usp.append(key, String(v)))
            } else {
              usp.append(key, String(value))
            }
          })
          return usp.toString()
        },
      },
    },
  )
  return data
}

export async function getQuickStats() {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/quick_stats",
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
    "/api/v1/analytics/hourly_distribution",
    {
      params,
    },
  )
  return data
}

export async function getSeasonalTrends(years = 2) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/seasonal_trends",
    {
      params: { years },
    },
  )
  return data
}

export async function getDistrictRevenue(params: { date_from: string; date_to: string }) {
  const { data } = await apiClient.get<AnalyticsResponse>(
    "/api/v1/analytics/geo_revenue",
    {
      params: { ...params, level: "district" },
    },
  )
  return data
}
