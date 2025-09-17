import type { BookingStatus } from "@/client/types.gen"
import clsx from "clsx"
import {
  BarChart3,
  Bed,
  CheckCircle,
  ChevronDown,
  Clock,
  LogOut,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react"
import { memo, useRef, useState } from "react"

interface GridControlsProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilters: BookingStatus[]
  onStatusFilterChange: (statuses: BookingStatus[]) => void
  roomTypeFilters: string[]
  onRoomTypeFilterChange: (types: string[]) => void
  availableRoomTypes: string[]
  totalBookings: number
  occupancyRate: number
  onClearAllFilters: () => void
}

const statusConfig = {
  confirmed: {
    icon: CheckCircle,
    color:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-600/25 dark:text-emerald-400 dark:border-emerald-600/50",
    label: "Confirmed",
  },
  checked_in: {
    icon: Clock,
    color:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-600/25 dark:text-blue-400 dark:border-blue-600/50",
    label: "Checked In",
  },
  checked_out: {
    icon: LogOut,
    color:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-600/25 dark:text-violet-400 dark:border-violet-600/50",
    label: "Checked Out",
  },
  cancelled: {
    icon: XCircle,
    color:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-600/25 dark:text-red-400 dark:border-red-600/50",
    label: "Cancelled",
  },
}

export const GridControls = memo(function GridControls({
  searchTerm,
  onSearchChange,
  statusFilters,
  onStatusFilterChange,
  roomTypeFilters,
  onRoomTypeFilterChange,
  availableRoomTypes,
  totalBookings,
  occupancyRate,
  onClearAllFilters,
}: GridControlsProps) {
  const [showRoomTypeFilter, setShowRoomTypeFilter] = useState(false)
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const statusButtonRef = useRef<HTMLButtonElement>(null)

  const hasActiveFilters =
    statusFilters.length > 0 ||
    roomTypeFilters.length > 0 ||
    searchTerm.length > 0

  const toggleStatusFilter = (status: BookingStatus) => {
    if (statusFilters.includes(status)) {
      onStatusFilterChange(statusFilters.filter((s) => s !== status))
    } else {
      onStatusFilterChange([...statusFilters, status])
    }
  }

  const toggleRoomTypeFilter = (roomType: string) => {
    if (roomTypeFilters.includes(roomType)) {
      onRoomTypeFilterChange(roomTypeFilters.filter((t) => t !== roomType))
    } else {
      onRoomTypeFilterChange([...roomTypeFilters, roomType])
    }
  }

  return (
    <div className="bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600 px-3 md:px-4 py-2 md:py-3 overflow-x-auto">
      <div className="flex items-center justify-between gap-2 md:gap-4 min-w-fit">
        {/* Left side - Search and Filters */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-32 md:w-48 lg:w-80 pl-10 pr-4 py-1.5 md:py-2 text-sm md:text-base border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filters - inline on desktop, dropdown on tablet/mobile */}
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon
              const isActive = statusFilters.includes(status as BookingStatus)

              return (
                <button
                  type="button"
                  key={status}
                  onClick={() => toggleStatusFilter(status as BookingStatus)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                    isActive
                      ? config.color
                      : "bg-white dark:bg-dark-3 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-dark-2",
                  )}
                  title={config.label}
                >
                  <Icon className="w-3 h-3" />
                  <span>{config.label}</span>
                </button>
              )
            })}
          </div>

          {/* Status Filter Dropdown - show on tablet/mobile */}
          <div className="relative lg:hidden">
            <button
              ref={statusButtonRef}
              type="button"
              onClick={() => setShowStatusFilter(!showStatusFilter)}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2",
                statusFilters.length > 0
                  ? "bg-blue-100 dark:bg-blue-600/25 border-blue-300 dark:border-blue-600/50 text-blue-700 dark:text-blue-400"
                  : "bg-white dark:bg-dark-3 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-2",
              )}
            >
              <CheckCircle className="w-4 h-4" />
              Status
              {statusFilters.length > 0 && (
                <span className="bg-blue-600 dark:bg-blue-400 text-white dark:text-neutral-900 text-xs px-1.5 py-0.5 rounded-full">
                  {statusFilters.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showStatusFilter && statusButtonRef.current && (
              <div
                className="fixed z-50 w-48 bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg"
                style={{
                  top: statusButtonRef.current.getBoundingClientRect().bottom + 4,
                  left: statusButtonRef.current.getBoundingClientRect().left,
                }}
              >
                <div className="p-2">
                  {Object.entries(statusConfig).map(([status, config]) => {
                    const Icon = config.icon
                    const isActive = statusFilters.includes(status as BookingStatus)

                    return (
                      <button
                        type="button"
                        key={status}
                        onClick={() => toggleStatusFilter(status as BookingStatus)}
                        className={clsx(
                          "w-full px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                          isActive
                            ? "bg-blue-100 dark:bg-blue-600/25 text-blue-700 dark:text-blue-400"
                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-3",
                        )}
                      >
                        <div
                          className={clsx(
                            "w-3 h-3 rounded border-2 flex items-center justify-center",
                            isActive
                              ? "border-blue-600 dark:border-blue-400 bg-blue-600 dark:bg-blue-400"
                              : "border-neutral-300 dark:border-neutral-600",
                          )}
                        >
                          {isActive && (
                            <div className="w-1.5 h-1.5 bg-white dark:bg-neutral-900 rounded-full" />
                          )}
                        </div>
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Room Type Filter */}
          <div className="relative">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setShowRoomTypeFilter(!showRoomTypeFilter)}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2",
                roomTypeFilters.length > 0
                  ? "bg-primary-100 dark:bg-primary-600/25 border-primary-300 dark:border-primary-600/50 text-primary-700 dark:text-primary-400"
                  : "bg-white dark:bg-dark-3 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-2",
              )}
            >
              <Bed className="w-4 h-4" />
              Room Types
              {roomTypeFilters.length > 0 && (
                <span className="bg-primary-600 dark:bg-primary-400 text-white dark:text-neutral-900 text-xs px-1.5 py-0.5 rounded-full">
                  {roomTypeFilters.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showRoomTypeFilter && buttonRef.current && (
              <div
                className="fixed z-50 w-48 bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg"
                style={{
                  top: buttonRef.current.getBoundingClientRect().bottom + 4,
                  left: buttonRef.current.getBoundingClientRect().left,
                }}
              >
                <div className="p-2">
                  {availableRoomTypes.map((roomType) => (
                    <button
                      type="button"
                      key={roomType}
                      onClick={() => toggleRoomTypeFilter(roomType)}
                      className={clsx(
                        "w-full px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                        roomTypeFilters.includes(roomType)
                          ? "bg-primary-100 dark:bg-primary-600/25 text-primary-700 dark:text-primary-400"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-3",
                      )}
                    >
                      <div
                        className={clsx(
                          "w-3 h-3 rounded border-2 flex items-center justify-center",
                          roomTypeFilters.includes(roomType)
                            ? "border-primary-600 dark:border-primary-400 bg-primary-600 dark:bg-primary-400"
                            : "border-neutral-300 dark:border-neutral-600",
                        )}
                      >
                        {roomTypeFilters.includes(roomType) && (
                          <div className="w-1.5 h-1.5 bg-white dark:bg-neutral-900 rounded-full" />
                        )}
                      </div>
                      {roomType}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAllFilters}
              className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Right side - Stats - hide on small screens */}
        <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
              <Users className="w-4 h-4" />
              <span>{totalBookings} bookings</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
              <BarChart3 className="w-4 h-4" />
              <span>{occupancyRate}% occupied</span>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside handlers */}
      {showRoomTypeFilter && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowRoomTypeFilter(false)}
        />
      )}
      {showStatusFilter && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStatusFilter(false)}
        />
      )}
    </div>
  )
})
