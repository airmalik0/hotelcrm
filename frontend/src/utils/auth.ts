import type { Token, UserPublic } from "@/client"

const TOKEN_KEY = "hotel_crm_token"
const USER_KEY = "hotel_crm_user"

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Handle localStorage errors silently
  }
}

export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // Handle localStorage errors silently
  }
}

export const getStoredUser = (): UserPublic | null => {
  try {
    const userString = localStorage.getItem(USER_KEY)
    return userString ? JSON.parse(userString) : null
  } catch {
    return null
  }
}

export const setStoredUser = (user: UserPublic): void => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Handle localStorage errors silently
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
