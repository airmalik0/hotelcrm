import { useAuth } from "@/contexts/AuthContext"
import { useRole } from "@/hooks/useRole"
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react"
import type React from "react"
import { type ReactNode, useEffect, useState } from "react"
import { Link, useLocation } from "react-router-dom"

interface MainLayoutProps {
  children: ReactNode
}

interface MenuItem {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  children?: MenuItem[]
  roles: string[]
}

const menuItems: MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: Home,
    href: "/",
    roles: ["admin", "manager", "host"],
  },
  {
    key: "calendar",
    label: "Calendar",
    icon: Calendar,
    href: "/calendar",
    roles: ["admin", "manager", "host"],
  },
  {
    key: "rooms",
    label: "Room Management",
    icon: Building2,
    href: "/rooms",
    roles: ["admin", "manager", "host"],
  },
  {
    key: "customers",
    label: "Customer Database",
    icon: Users,
    href: "/customers",
    roles: ["admin", "manager", "host"],
  },
  {
    key: "users",
    label: "User Management",
    icon: Settings,
    href: "/users",
    roles: ["admin"],
  },
  {
    key: "audit",
    label: "Audit Logs",
    icon: FileText,
    href: "/audit",
    roles: ["admin"],
  },
]

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const location = useLocation()
  const { user, logout } = useAuth()
  const { hasAnyRole } = useRole()

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

  const filteredMenuItems = menuItems.filter((item) =>
    hasAnyRole(item.roles as any),
  )

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
                {item.label}
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
                ?.filter((child) => hasAnyRole(child.roles as any))
                .map((child) => (
                  <li key={child.key}>
                    <Link
                      to={child.href!}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-600/25 ${
                        isActive(child.href!)
                          ? "bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400"
                          : "text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                      <span className="font-medium">{child.label}</span>
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
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-primary-50 dark:hover:bg-primary-600/25 ${
            itemActive
              ? "bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400"
              : "text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400"
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-medium">{item.label}</span>
        </Link>
      </li>
    )
  }

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-dark-1">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-2 border-r border-neutral-200 dark:border-neutral-600 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        {/* Close button for mobile */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
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
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Header */}
        <header className="bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Search */}
              <form className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-dark-2 text-neutral-900 dark:text-white placeholder-neutral-500 focus:ring-2 focus:ring-primary-300 focus:outline-none"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              </form>
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
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
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
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-danger-100 dark:hover:bg-danger-600/25 hover:text-danger-600 dark:hover:text-danger-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
