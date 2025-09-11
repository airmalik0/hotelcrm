import type { UserPublic, UserCreate, UserUpdate } from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

interface PaginatedResponse<T> {
  data: T[]
  count: number
}

/**
 * Get list of users with pagination
 */
export async function getUsers(params?: {
  skip?: number
  limit?: number
}): Promise<PaginatedResponse<UserPublic>> {
  const response = await apiClient.get<PaginatedResponse<UserPublic>>("/api/v1/users/", {
    params: {
      skip: params?.skip || 0,
      limit: params?.limit || 100,
    },
  })
  return response.data
}

/**
 * Get single user by ID
 */
export async function getUser(userId: string): Promise<UserPublic> {
  const response = await apiClient.get<UserPublic>(`/api/v1/users/${userId}`)
  return response.data
}

/**
 * Create new user
 */
export async function createUser(data: UserCreate): Promise<UserPublic> {
  const response = await apiClient.post<UserPublic>("/api/v1/users/", data)
  return response.data
}

/**
 * Update user
 */
export async function updateUser(userId: string, data: UserUpdate): Promise<UserPublic> {
  const response = await apiClient.patch<UserPublic>(`/api/v1/users/${userId}`, data)
  return response.data
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/api/v1/users/${userId}`)
}