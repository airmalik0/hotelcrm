import { client } from "@/client"

// Helper to get auth token
function getToken(): string | null {
  return localStorage.getItem("hotel_crm_token")
}

// Helper to remove auth token
function removeToken(): void {
  localStorage.removeItem("hotel_crm_token")
}

// Configure the default auto-generated client with interceptors and base URL
export function setupApiClient() {
  const baseURL = import.meta.env.VITE_API_URL || ""
  
  // Set axios defaults directly
  client.instance.defaults.baseURL = baseURL
  
  // Add request interceptor for auth token
  client.instance.interceptors.request.use(
    (config) => {
      const token = getToken()
      if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )
  
  // Add response interceptor for 401 handling
  client.instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        removeToken()
        // Only redirect if we're not already on the login page
        if (window.location.pathname !== "/login") {
          window.location.href = "/login"
        }
      }
      return Promise.reject(error)
    }
  )
  
  console.log("API client configured with base URL:", baseURL)
}