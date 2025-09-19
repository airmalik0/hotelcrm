import { ErrorBoundary } from "@/components/ErrorBoundary"
import { AuthProvider } from "@/contexts/AuthContext"
import "@/lib/axios" // Initialize axios on import
import { router } from "@/router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{}}
            toastOptions={{
              // Default options for all toasts
              duration: 4000,
              style: {
                background: "var(--toast-bg, #fff)",
                color: "var(--toast-color, #000)",
                border: "1px solid var(--toast-border, #e5e7eb)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                padding: "12px 16px",
              },
              // Success toasts
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              // Error toasts
              error: {
                duration: 5000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
