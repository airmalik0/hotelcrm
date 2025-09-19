import { ResponsiveDebug, ResponsiveIndicator } from "@/components/debug/ResponsiveDebug"
import { AuthProvider } from "@/contexts/AuthContext"
import "@/lib/axios" // Initialize axios on import
import { router } from "@/router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { RouterProvider } from "react-router-dom"

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        {/* Debug components - toggle with keyboard shortcuts */}
        <ResponsiveDebug />
        <ResponsiveIndicator />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
