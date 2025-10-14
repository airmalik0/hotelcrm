import type { AuditLogPublic } from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

interface PaginatedResponse<T> {
  data: T[]
  count: number
}

interface AuditStatsResponse {
  period_days: number
  total_actions: number
  actions_by_type: Record<string, number>
  actions_by_entity: Record<string, number>
  top_users: Record<string, number>
}

/**
 * Get list of audit logs with filtering and pagination
 */
export async function getAuditLogs(params?: {
  skip?: number
  limit?: number
  user_name?: string | null
  action?: string | null
  entity_type?: string | null
  search?: string | null
}): Promise<PaginatedResponse<AuditLogPublic>> {
  const response = await apiClient.get<PaginatedResponse<AuditLogPublic>>(
    "/api/v1/audit/",
    {
      params: {
        skip: params?.skip || 0,
        limit: params?.limit || 50,
        user_name: params?.user_name || undefined,
        action: params?.action || undefined,
        entity_type: params?.entity_type || undefined,
        search: params?.search || undefined,
      },
    },
  )
  return response.data
}

/**
 * Get single audit log by ID
 */
export async function getAuditLog(auditLogId: string): Promise<AuditLogPublic> {
  const response = await apiClient.get<AuditLogPublic>(
    `/api/v1/audit/${auditLogId}`,
  )
  return response.data
}

/**
 * Get audit statistics summary
 */
export async function getAuditStats(): Promise<AuditStatsResponse> {
  const response = await apiClient.get<AuditStatsResponse>(
    "/api/v1/audit/stats/summary",
  )
  return response.data
}
