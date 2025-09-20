import { login as apiLogin, getCurrentUser } from "@/api/auth"
import { useAuth } from "@/contexts/AuthContext"
import { AuthLayout } from "@/layouts/AuthLayout"
import { useMutation } from "@tanstack/react-query"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true })
    }
  }, [isAuthenticated, navigate])

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      // Use our API wrapper for OAuth2 authentication
      return await apiLogin(credentials.username, credentials.password)
    },
    onSuccess: async (response) => {
      // Type guard to ensure we have a valid token response
      if (!response?.access_token) {
        throw new Error("Invalid response: no access token")
      }

      const token = response.access_token

      // Get user info from token test
      try {
        // Set token temporarily to test it
        localStorage.setItem("hotel_crm_token", token)
        const userData = await getCurrentUser()

        // Login successful
        login(token, userData)

        // Redirect based on role
        navigate("/", { replace: true })
      } catch (error) {
        // Clean up token if user fetch fails
        localStorage.removeItem("hotel_crm_token")
        throw new Error("Authentication failed")
      }
    },
    onError: () => {
      // Don't log authentication errors to console (security best practice)
      // Error will be shown in UI instead
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate({
      username: formData.username,
      password: formData.password,
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  return (
    <AuthLayout
      title="Sign In to your Account"
      subtitle="Welcome back! Please enter your details"
    >
      <form onSubmit={handleSubmit}>
        {/* Email/Username Field */}
        <div className="relative mb-4">
          <span className="absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none flex text-xl text-neutral-500 dark:text-neutral-400">
            <Mail className="w-5 h-5" />
          </span>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="border-neutral-300 dark:border-neutral-500 rounded-xl bg-neutral-50 dark:bg-dark-2 px-5 py-2.5 ps-11 w-full h-[56px] text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-4 focus:ring-primary-300 focus:outline-none"
            placeholder="Username"
            required
            disabled={loginMutation.isPending}
          />
        </div>

        {/* Password Field */}
        <div className="relative mb-5">
          <span className="absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none flex text-xl text-neutral-500 dark:text-neutral-400">
            <Lock className="w-5 h-5" />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="border-neutral-300 dark:border-neutral-500 rounded-xl bg-neutral-50 dark:bg-dark-2 px-5 py-2.5 ps-11 pe-11 w-full h-[56px] text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-4 focus:ring-primary-300 focus:outline-none"
            placeholder="Password"
            required
            disabled={loginMutation.isPending}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400 hover:text-primary-600 cursor-pointer"
            disabled={loginMutation.isPending}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="mt-7">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="w-4 h-4 border border-neutral-300 rounded focus:ring-primary-300 text-primary-600"
                id="rememberMe"
                disabled={loginMutation.isPending}
              />
              <label
                htmlFor="rememberMe"
                className="ms-2 text-sm text-neutral-700 dark:text-neutral-300"
              >
                Remember me
              </label>
            </div>
            <button
              type="button"
              className="text-primary-600 font-medium hover:underline text-sm"
              disabled={loginMutation.isPending}
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {/* Error Message */}
        {loginMutation.isError && (
          <div className="mt-4 p-3 bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400 border border-danger-200 dark:border-danger-600/50 rounded-lg text-sm">
            Invalid username or password. Please try again.
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="rounded-xl py-3 px-6 inline-flex transition bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-75 disabled:cursor-not-allowed justify-center text-sm w-full mt-8 h-12 items-center font-medium"
        >
          {loginMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
