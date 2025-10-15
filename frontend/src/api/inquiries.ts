import type {
  CustomerInquiryPublic,
  CustomerInquiryUpdate,
  InquiryStatus,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

interface PaginatedResponse<T> {
  data: T[]
  count: number
}

/**
 * Get list of customer inquiries with filtering and pagination
 */
export async function getInquiries(params?: {
  skip?: number
  limit?: number
  status?: InquiryStatus | null
  customer_id?: string | null
  bot_user_id?: string | null
}): Promise<PaginatedResponse<CustomerInquiryPublic>> {
  const response = await apiClient.get<
    PaginatedResponse<CustomerInquiryPublic>
  >("/api/v1/inquiries/", {
    params: {
      skip: params?.skip || 0,
      limit: params?.limit || 50,
      status: params?.status || undefined,
      customer_id: params?.customer_id || undefined,
      bot_user_id: params?.bot_user_id || undefined,
    },
  })
  return response.data
}

/**
 * Get single inquiry by ID
 */
export async function getInquiry(
  inquiryId: string,
): Promise<CustomerInquiryPublic> {
  const response = await apiClient.get<CustomerInquiryPublic>(
    `/api/v1/inquiries/${inquiryId}`,
  )
  return response.data
}

/**
 * Update inquiry
 */
export async function updateInquiry(
  inquiryId: string,
  data: CustomerInquiryUpdate,
): Promise<CustomerInquiryPublic> {
  const response = await apiClient.patch<CustomerInquiryPublic>(
    `/api/v1/inquiries/${inquiryId}`,
    data,
  )
  return response.data
}

/**
 * Assign inquiry to user
 */
export async function assignInquiry(
  inquiryId: string,
  userId: string,
): Promise<CustomerInquiryPublic> {
  const response = await apiClient.post<CustomerInquiryPublic>(
    `/api/v1/inquiries/${inquiryId}/assign`,
    { user_id: userId },
  )
  return response.data
}

/**
 * Resolve inquiry
 */
export async function resolveInquiry(
  inquiryId: string,
  resolutionNotes: string,
): Promise<CustomerInquiryPublic> {
  const response = await apiClient.post<CustomerInquiryPublic>(
    `/api/v1/inquiries/${inquiryId}/resolve`,
    { resolution_notes: resolutionNotes },
  )
  return response.data
}
