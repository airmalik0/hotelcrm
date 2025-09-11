import { type UserPublic, loginTestToken } from "@/client"
import {
  getStoredUser,
  getToken,
  removeToken,
  setStoredUser,
  setToken,
} from "@/utils/auth"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"

interface AuthContextType {
  user: UserPublic | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, user: UserPublic) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserPublic | null>(getStoredUser())
  const queryClient = useQueryClient()

  // Test token validity on app load
  const {
    data: currentUser,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => loginTestToken({ throwOnError: true }),
    enabled: !!getToken(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update user state based on token validation
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser)
      setStoredUser(currentUser)
    } else if (error) {
      // Token is invalid, clear auth state
      setUser(null)
      removeToken()
    }
  }, [currentUser, error])

  const login = (token: string, userData: UserPublic) => {
    console.log("AuthContext - Login called with user:", userData)
    setToken(token)
    setUser(userData)
    setStoredUser(userData)
    // Invalidate and refetch auth query
    queryClient.invalidateQueries({ queryKey: ["auth"] })
  }

  const logout = () => {
    setUser(null)
    removeToken()
    queryClient.clear() // Clear all cached data
  }

  const value: AuthContextType = {
    user,
    isLoading: isLoading && !!getToken(),
    isAuthenticated: !!user,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
