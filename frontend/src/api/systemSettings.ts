import type { SystemSettingsPublic, SystemSettingsUpdate } from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

/**
 * Get current system settings
 */
export async function getSystemSettings(): Promise<SystemSettingsPublic> {
  const response = await apiClient.get<SystemSettingsPublic>(
    "/api/v1/system-settings/",
  )
  return response.data
}

/**
 * Update system settings (admin only)
 */
export async function updateSystemSettings(
  data: SystemSettingsUpdate,
): Promise<SystemSettingsPublic> {
  const response = await apiClient.patch<SystemSettingsPublic>(
    "/api/v1/system-settings/",
    data,
  )
  return response.data
}

