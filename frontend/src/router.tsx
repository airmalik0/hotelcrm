import { ProtectedRoute } from "@/components/ProtectedRoute"
import { MainLayout } from "@/layouts/MainLayout"
import { Dashboard } from "@/pages/Dashboard"
import { Login } from "@/pages/Login"
import { createBrowserRouter, Navigate } from "react-router-dom"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <Dashboard />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/calendar",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Calendar Module
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Time continuum calendar implementation coming soon...
            </p>
          </div>
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/rooms",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Room Management
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Room management interface coming soon...
            </p>
          </div>
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/customers",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Customer Database
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Customer management interface coming soon...
            </p>
          </div>
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/users",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              User Management
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              User management interface coming soon...
            </p>
          </div>
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/audit",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Audit Logs
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Audit log interface coming soon...
            </p>
          </div>
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])