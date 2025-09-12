import type { UserPublic } from "@/client/types.gen"
import { apiClient } from "@/lib/axios"

interface LoginResponse {
  access_token: string
  token_type: string
}

/**
 * Login with username and password
 * Uses URLSearchParams to handle OAuth2 form-urlencoded properly
 */
export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append("grant_type", "password")
  formData.append("username", username)
  formData.append("password", password)

  try {
    const response = await apiClient.post<LoginResponse>(
      "/api/v1/login/access-token",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // In production, you might want to add:
        // validateStatus: (status) => status < 500, // Don't throw on 4xx
      },
    )

    return response.data
  } catch (error: any) {
    // Silently handle authentication errors without logging to console
    // The UI will show the error message to the user
    if (error.response?.status === 401) {
      throw new Error("Invalid credentials")
    }
    // For other errors, re-throw
    throw error
  }
}

/**
 * Test token and get current user
 */
export async function getCurrentUser(): Promise<UserPublic> {
  const response = await apiClient.post<UserPublic>("/api/v1/login/test-token")
  return response.data
}

/**
 * Logout (if backend implements it)
 */
export async function logout(): Promise<void> {
  // If backend has logout endpoint, call it here
  // For now, just clear local storage
  localStorage.removeItem("hotel_crm_token")
}
