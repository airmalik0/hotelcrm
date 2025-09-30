import { ProtectedRoute } from "@/components/ProtectedRoute"
import { MainLayout } from "@/layouts/MainLayout"
import { Analytics } from "@/pages/Analytics"
import { AuditLogs } from "@/pages/AuditLogs"
import { BookingGridPage } from "@/pages/BookingGrid"
import { CustomerList } from "@/pages/CustomerList"
import { CustomerProfile } from "@/pages/CustomerProfile"
import { Dashboard } from "@/pages/Dashboard"
import { Expenses } from "@/pages/Expenses"
import { Login } from "@/pages/Login"
import { MarketingCampaigns } from "@/pages/MarketingCampaigns"
import { RoomList } from "@/pages/RoomList"
import { UserList } from "@/pages/UserList"
import { Navigate, createBrowserRouter } from "react-router-dom"

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
    path: "/booking-grid",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <BookingGridPage />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/rooms",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <RoomList />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/customers",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <CustomerList />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/customers/:customerId",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <CustomerProfile />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/customers/:customerId/edit",
    element: (
      <ProtectedRoute>
        <MainLayout>
          <CustomerProfile />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/users",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout>
          <UserList />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/audit",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <MainLayout>
          <AuditLogs />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/analytics",
    element: (
      <ProtectedRoute allowedRoles={["admin", "manager"]}>
        <MainLayout>
          <Analytics />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/marketing",
    element: (
      <ProtectedRoute allowedRoles={["admin", "manager"]}>
        <MainLayout>
          <MarketingCampaigns />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/expenses",
    element: (
      <ProtectedRoute allowedRoles={["admin", "manager"]}>
        <MainLayout>
          <Expenses />
        </MainLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])
