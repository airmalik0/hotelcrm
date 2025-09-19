import { navigateFromOutside } from "@/utils/navigation"
import axios from "axios"

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 30000, // 30 second timeout
  headers: {
    "Content-Type": "application/json",
  },
})

// Helper to get auth token
function getToken(): string | null {
  return localStorage.getItem("hotel_crm_token")
}

// Helper to remove auth token
function removeToken(): void {
  localStorage.removeItem("hotel_crm_token")
}

// Add request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Add response interceptor for 401 handling and error processing
apiClient.interceptors.response.use(
  (response) => {
    // Validate response has expected JSON structure
    try {
      if (response.headers["content-type"]?.includes("application/json") &&
          typeof response.data === "string") {
        // Try to parse JSON if it came as string
        response.data = JSON.parse(response.data)
      }
    } catch (e) {
      // If JSON parsing fails, wrap in a structured error
      console.warn("Response JSON parsing failed:", e)
    }


    return response
  },
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      removeToken()
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== "/login") {
        navigateFromOutside("/login", true)
      }
    }

    // Don't log authentication errors on login page
    if (
      window.location.pathname === "/login" &&
      error.response?.status === 401
    ) {
      // Silently reject without logging
      return Promise.reject(error)
    }

    // Enhance error with additional context for timeout
    if (error.code === "ECONNABORTED") {
      error.isTimeout = true
    }

    return Promise.reject(error)
  },
)

// API client initialized
