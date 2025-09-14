import { useState } from "react"
import { format, addDays, subDays } from "date-fns"
import type { BookingStatus } from "@/client/types.gen"
import {
  Search, Filter, Calendar, Users, Bed, BarChart3,
  CheckCircle, Clock, LogOut, XCircle, X, ChevronDown
} from "lucide-react"
import clsx from "clsx"

interface GridControlsProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilters: BookingStatus[]
  onStatusFilterChange: (statuses: BookingStatus[]) => void
  roomTypeFilters: string[]
  onRoomTypeFilterChange: (types: string[]) => void
  dateRange: { start: Date; end: Date }
  onDateRangeChange: (range: { start: Date; end: Date }) => void
  availableRoomTypes: string[]
  totalBookings: number
  occupancyRate: number
  onClearAllFilters: () => void
}

const statusConfig = {
  confirmed: {
    icon: CheckCircle,
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-600/25 dark:text-emerald-400 dark:border-emerald-600/50",
    label: "Confirmed"
  },
  checked_in: {
    icon: Clock,
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-600/25 dark:text-blue-400 dark:border-blue-600/50",
    label: "Checked In"
  },
  checked_out: {
    icon: LogOut,
    color: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-600/25 dark:text-violet-400 dark:border-violet-600/50",
    label: "Checked Out"
  },
  cancelled: {
    icon: XCircle,
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-600/25 dark:text-red-400 dark:border-red-600/50",
    label: "Cancelled"
  },
}

export function GridControls({
  searchTerm,
  onSearchChange,
  statusFilters,
  onStatusFilterChange,
  roomTypeFilters,
  onRoomTypeFilterChange,
  dateRange,
  onDateRangeChange,
  availableRoomTypes,
  totalBookings,
  occupancyRate,
  onClearAllFilters,
}: GridControlsProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showRoomTypeFilter, setShowRoomTypeFilter] = useState(false)

  const hasActiveFilters = statusFilters.length > 0 || roomTypeFilters.length > 0 || searchTerm.length > 0

  const toggleStatusFilter = (status: BookingStatus) => {
    if (statusFilters.includes(status)) {
      onStatusFilterChange(statusFilters.filter(s => s !== status))
    } else {
      onStatusFilterChange([...statusFilters, status])
    }
  }

  const toggleRoomTypeFilter = (roomType: string) => {
    if (roomTypeFilters.includes(roomType)) {
      onRoomTypeFilterChange(roomTypeFilters.filter(t => t !== roomType))
    } else {
      onRoomTypeFilterChange([...roomTypeFilters, roomType])
    }
  }

  const getQuickDateRange = (days: number) => {
    const today = new Date()
    return {
      start: days < 0 ? addDays(today, days) : today,
      end: days < 0 ? today : addDays(today, days)
    }
  }

  return (
    <div className="bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Search and Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search guests, rooms, or booking IDs..."
              className="w-80 pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon
              const isActive = statusFilters.includes(status as BookingStatus)

              return (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status as BookingStatus)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5",
                    isActive
                      ? config.color
                      : "bg-white dark:bg-dark-3 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-dark-2"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                </button>
              )
            })}
          </div>

          {/* Room Type Filter */}
          <div className="relative">
            <button
              onClick={() => setShowRoomTypeFilter(!showRoomTypeFilter)}
              className={clsx(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2",
                roomTypeFilters.length > 0
                  ? "bg-primary-100 dark:bg-primary-600/25 border-primary-300 dark:border-primary-600/50 text-primary-700 dark:text-primary-400"
                  : "bg-white dark:bg-dark-3 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-2"
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

            {showRoomTypeFilter && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg z-20">
                <div className="p-2">
                  {availableRoomTypes.map((roomType) => (
                    <button
                      key={roomType}
                      onClick={() => toggleRoomTypeFilter(roomType)}
                      className={clsx(
                        "w-full px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                        roomTypeFilters.includes(roomType)
                          ? "bg-primary-100 dark:bg-primary-600/25 text-primary-700 dark:text-primary-400"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-3"
                      )}
                    >
                      <div className={clsx(
                        "w-3 h-3 rounded border-2 flex items-center justify-center",
                        roomTypeFilters.includes(roomType)
                          ? "border-primary-600 dark:border-primary-400 bg-primary-600 dark:bg-primary-400"
                          : "border-neutral-300 dark:border-neutral-600"
                      )}>
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

          {/* Date Range Picker */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-dark-3 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-2 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Calendar className="w-4 h-4" />
              {format(dateRange.start, "MMM d")} - {format(dateRange.end, "MMM d")}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showDatePicker && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg z-20">
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={format(dateRange.start, "yyyy-MM-dd")}
                        onChange={(e) => onDateRangeChange({
                          start: new Date(e.target.value),
                          end: dateRange.end
                        })}
                        className="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded text-sm bg-white dark:bg-dark-3 text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={format(dateRange.end, "yyyy-MM-dd")}
                        onChange={(e) => onDateRangeChange({
                          start: dateRange.start,
                          end: new Date(e.target.value)
                        })}
                        className="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded text-sm bg-white dark:bg-dark-3 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="border-t border-neutral-200 dark:border-neutral-600 pt-3">
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">Quick Ranges</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: "Today", days: 0 },
                        { label: "Tomorrow", days: 1 },
                        { label: "Next 3 days", days: 3 },
                        { label: "Next 7 days", days: 7 },
                        { label: "Last 7 days", days: -7 },
                        { label: "Next 30 days", days: 30 }
                      ].map(({ label, days }) => (
                        <button
                          key={label}
                          onClick={() => {
                            onDateRangeChange(getQuickDateRange(days))
                            setShowDatePicker(false)
                          }}
                          className="px-2 py-1.5 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-3 rounded transition-colors text-left"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearAllFilters}
              className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>

        {/* Right side - Stats */}
        <div className="flex items-center gap-4">
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
      {showDatePicker && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowDatePicker(false)}
        />
      )}
      {showRoomTypeFilter && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowRoomTypeFilter(false)}
        />
      )}
    </div>
  )
}