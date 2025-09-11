import { AuthProvider } from "@/contexts/AuthContext"
import { setupApiClient } from "@/lib/api-client"
import { router } from "@/router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React, { useEffect } from "react"
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
  // Initialize API client configuration
  useEffect(() => {
    setupApiClient()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
