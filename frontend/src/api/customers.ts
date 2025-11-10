import type {
  CustomerCreate,
  CustomerPublic,
  CustomerUpdate,
  CustomersPublic,
  Message,
} from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

export interface CustomerParams {
  skip?: number
  limit?: number
  search?: string
  // Filters
  date_from?: string
  date_to?: string
  min_spent?: number
  max_spent?: number
  min_bookings?: number
  max_bookings?: number
  country_code?: string
  region?: string
  district?: string
  // Sorting
  order_by?: string
  order_direction?: string
}

/**
 * Get list of customers with optional search, filtering and sorting
 */
export async function getCustomers(
  params?: CustomerParams,
): Promise<CustomersPublic> {
  const response = await apiClient.get<CustomersPublic>("/api/v1/customers/", {
    params: {
      skip: params?.skip || 0,
      limit: params?.limit || 100,
      search: params?.search,
      // Filters
      date_from: params?.date_from,
      date_to: params?.date_to,
      min_spent: params?.min_spent,
      max_spent: params?.max_spent,
      min_bookings: params?.min_bookings,
      max_bookings: params?.max_bookings,
      country_code: params?.country_code,
      region: params?.region,
      district: params?.district,
      // Sorting
      order_by: params?.order_by || "created_at",
      order_direction: params?.order_direction || "desc",
    },
  })
  return response.data
}

/**
 * Get single customer by ID
 */
export async function getCustomer(customerId: string): Promise<CustomerPublic> {
  const response = await apiClient.get<CustomerPublic>(
    `/api/v1/customers/${customerId}`,
  )
  return response.data
}

/**
 * Create new customer
 */
export async function createCustomer(
  data: CustomerCreate,
): Promise<CustomerPublic> {
  const response = await apiClient.post<CustomerPublic>(
    "/api/v1/customers/",
    data,
  )
  return response.data
}

/**
 * Update existing customer
 */
export async function updateCustomer(
  customerId: string,
  data: CustomerUpdate,
): Promise<CustomerPublic> {
  const response = await apiClient.put<CustomerPublic>(
    `/api/v1/customers/${customerId}`,
    data,
  )
  return response.data
}

/**
 * Delete customer
 */
export async function deleteCustomer(customerId: string): Promise<Message> {
  const response = await apiClient.delete<Message>(
    `/api/v1/customers/${customerId}`,
  )
  return response.data
}
