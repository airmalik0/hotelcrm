import type { Token, UserPublic } from "@/client"

const TOKEN_KEY = "hotel_crm_token"
const USER_KEY = "hotel_crm_user"

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (error) {
    console.warn("Failed to get token from localStorage:", error)
    return null
  }
}

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (error) {
    console.error("Failed to save token to localStorage:", error)
    // Could add user notification for critical auth failures
  }
}

export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch (error) {
    console.warn("Failed to remove token from localStorage:", error)
    // Non-critical - user is logging out anyway
  }
}

export const getStoredUser = (): UserPublic | null => {
  try {
    const userString = localStorage.getItem(USER_KEY)
    return userString ? JSON.parse(userString) : null
  } catch (error) {
    console.warn("Failed to parse stored user from localStorage:", error)
    // Clear invalid user data
    try {
      localStorage.removeItem(USER_KEY)
    } catch {
      // Ignore cleanup errors
    }
    return null
  }
}

export const setStoredUser = (user: UserPublic): void => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch (error) {
    console.error("Failed to save user data to localStorage:", error)
    // This could affect user experience if user data can't be stored
  }
}

export const isAuthenticated = (): boolean => {
  return getToken() !== null
}

export const hasRole = (user: UserPublic | null, role: string): boolean => {
  return user?.role === role
}

export const hasAnyRole = (
  user: UserPublic | null,
  roles: string[],
): boolean => {
  return user?.role ? roles.includes(user.role) : false
}
