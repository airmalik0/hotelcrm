import type { UserRole } from "@/client/types.gen"
import { BREAKPOINTS } from "@/constants/breakpoints"
import { useAuth } from "@/contexts/AuthContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useRole } from "@/hooks/useRole"
import { useViewportWidth } from "@/hooks/useViewportWidth"
import { setupNavigationListener } from "@/utils/navigation"
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sun,
  Users,
} from "lucide-react"
import type React from "react"
import { type ReactNode, useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"

interface MainLayoutProps {
  children: ReactNode
}

interface MenuItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  children?: MenuItem[]
  roles: UserRole[]
}

export function MainLayout({ children }: MainLayoutProps) {
  const { t } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { hasAnyRole } = useRole()
  const viewportWidth = useViewportWidth()

  // Determine if we're on a 2xl+ screen for wider sidebar
  const isExtraLarge = viewportWidth >= BREAKPOINTS["2xl"]

  const menuItems: MenuItem[] = [
    {
      key: "dashboard",
      label: t.nav.dashboard,
      icon: Home,
      href: "/",
      roles: ["admin", "manager", "host"],
    },
    {
      key: "booking-grid",
      label: t.nav.bookingGrid,
      icon: LayoutGrid,
      href: "/booking-grid",
      roles: ["admin", "manager", "host"],
    },
    {
      key: "rooms",
      label: t.nav.rooms,
      icon: Building2,
      href: "/rooms",
      roles: ["admin", "manager", "host"],
    },
    {
      key: "customers",
      label: t.nav.customers,
      icon: Users,
      href: "/customers",
      roles: ["admin", "manager", "host"],
    },
    {
      key: "users",
      label: t.nav.users,
      icon: Settings,
      href: "/users",
      roles: ["admin"],
    },
    {
      key: "analytics",
      label: t.nav.analytics,
      icon: BarChart3,
      href: "/analytics",
      roles: ["admin", "manager"],
    },
    {
      key: "marketing",
      label: t.nav.marketing,
      icon: Mail,
      href: "/marketing",
      roles: ["admin", "manager"],
    },
    {
      key: "expenses",
      label: t.nav.expenses,
      icon: DollarSign,
      href: "/expenses",
      roles: ["admin", "manager"],
    },
    {
      key: "inquiries",
      label: t.nav.inquiries,
      icon: MessageSquare,
      href: "/inquiries",
      roles: ["admin", "manager"],
    },
    {
      key: "audit",
      label: t.nav.audit,
      icon: FileText,
      href: "/audit",
      roles: ["admin"],
    },
    {
      key: "settings",
      label: t.nav.settings,
      icon: Settings,
      href: "/settings",
      roles: ["admin"],
    },
  ]

  // Setup navigation listener for external navigation
  useEffect(() => {
    return setupNavigationListener(navigate)
  }, [navigate])

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true"
    setDarkMode(savedDarkMode)
    document.documentElement.classList.toggle("dark", savedDarkMode)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem("darkMode", newDarkMode.toString())
    document.documentElement.classList.toggle("dark", newDarkMode)
  }

  const toggleMenu = (key: string) => {
    setExpandedMenus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const isActive = (href: string) => {
    return (
      location.pathname === href ||
      (href !== "/" && location.pathname.startsWith(href))
    )
  }

  const filteredMenuItems = menuItems.filter((item) => hasAnyRole(item.roles))

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = item.children && item.children.length > 0
    const itemActive = item.href ? isActive(item.href) : false
    const isExpanded = expandedMenus.includes(item.key)

    if (hasChildren) {
      return (
        <li key={item.key}>
          <button
            onClick={() => toggleMenu(item.key)}
            className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
              isExpanded ? "bg-neutral-100 dark:bg-neutral-700" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              <span className="text-neutral-900 dark:text-white font-medium">
                {t.nav[item.key as keyof typeof t.nav] || item.label}
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            )}
          </button>
          {isExpanded && (
            <ul className="ml-8 mt-2 space-y-1">
              {item.children
                ?.filter((child) => hasAnyRole(child.roles))
                .map((child) => (
                  <li key={child.key}>
                    <Link
                      to={child.href!}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-600/30 ${
                        isActive(child.href!)
                          ? "bg-primary-100 dark:bg-primary-600/30 text-primary-600 dark:text-primary-400"
                          : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                      <span className="font-medium">
                        {t.nav[child.key as keyof typeof t.nav] || child.label}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </li>
      )
    }

    return (
      <li key={item.key}>
        <Link
          to={item.href!}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-600/30 ${
            itemActive
              ? "bg-primary-100 dark:bg-primary-600/30 text-primary-600 dark:text-primary-400"
              : "text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400"
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">
            {t.nav[item.key as keyof typeof t.nav] || item.label}
          </span>
        </Link>
      </li>
    )
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-dark-1">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${
          isExtraLarge ? "w-80" : "w-64"
        } bg-white dark:bg-dark-2 border-r border-neutral-200 dark:border-neutral-600 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out xl:translate-x-0 xl:static xl:inset-0`}
      >
        {/* Close button for mobile */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 xl:hidden w-8 h-8 flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-neutral-200 dark:border-neutral-600">
          <div className="w-10 h-10 bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-lg font-bold text-white">H</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
              Hotel CRM
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
              {user?.role} Panel
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4">
            <ul className="space-y-2">
              {filteredMenuItems.map(renderMenuItem)}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="xl:hidden w-10 h-10 flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <Menu className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Dark mode toggle */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 dark:text-white rounded-full flex justify-center items-center hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-neutral-600 dark:text-white" />
                ) : (
                  <Moon className="w-5 h-5 text-neutral-600 dark:text-white" />
                )}
              </button>

              {/* User profile */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {user?.username}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                    {user?.role}
                  </p>
                </div>
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-danger-100 dark:hover:bg-danger-600/30 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                  title={t.auth.logout}
                >
                  <LogOut className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-danger-600 dark:group-hover:text-danger-400" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
