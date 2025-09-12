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
}

/**
 * Get list of customers with optional search
 */
export async function getCustomers(
  params?: CustomerParams,
): Promise<CustomersPublic> {
  const response = await apiClient.get<CustomersPublic>("/api/v1/customers/", {
    params: {
      skip: params?.skip || 0,
      limit: params?.limit || 100,
      search: params?.search,
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
