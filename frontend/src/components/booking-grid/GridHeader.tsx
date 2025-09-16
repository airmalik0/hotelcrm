import { memo } from "react"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Calendar, Plus, LayoutGrid, CalendarDays, Menu, X } from "lucide-react"
import type { ViewMode } from "@/utils/date-helpers"
import clsx from "clsx"

interface GridHeaderProps {
  currentDate: Date
  viewMode: ViewMode
  viewStart: Date
  viewEnd: Date
  occupancyRate: number
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onViewModeChange: (mode: ViewMode) => void
  onAddBooking: () => void
  isMobileView?: boolean
  onMenuClick?: () => void
  isMenuOpen?: boolean
}

export const GridHeader = memo(function GridHeader({
  currentDate,
  viewMode,
  viewStart,
  viewEnd,
  occupancyRate,
  onPrevious,
  onNext,
  onToday,
  onViewModeChange,
  onAddBooking,
  isMobileView = false,
  onMenuClick,
  isMenuOpen = false,
}: GridHeaderProps) {
  // Always show date range for both modes
  const dateRangeText = `${format(viewStart, "MMM d")} - ${format(viewEnd, "MMM d, yyyy")}`

  return (
    <div className="bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600">
      <div className="px-3 py-2 md:px-4 md:py-3">
        {/* Mobile layout */}
        <div className="md:hidden">
          {/* Top row - menu, date, add button */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {/* Mobile menu button */}
              <button
                onClick={onMenuClick}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
                aria-label="Toggle room list"
              >
                {isMenuOpen ? (
                  <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                ) : (
                  <Menu className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                )}
              </button>

              {/* Date display */}
              <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                {format(viewStart, "MMM d")} - {format(viewEnd, "d")}
              </div>
            </div>

            {/* Add button */}
            <button
              onClick={onAddBooking}
              className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom row - navigation and occupancy */}
          <div className="flex items-center justify-between">
            {/* Navigation */}
            <div className="flex items-center gap-1">
              <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-600">
                <button
                  onClick={onPrevious}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
                  aria-label={`Previous ${viewMode}`}
                >
                  <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </button>
                <button
                  onClick={onNext}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors border-l border-neutral-200 dark:border-neutral-600"
                  aria-label={`Next ${viewMode}`}
                >
                  <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>
              <button
                onClick={onToday}
                className="px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Today
              </button>
            </div>

            {/* Occupancy */}
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full transition-all duration-300",
                    occupancyRate >= 80 ? "bg-red-500" :
                    occupancyRate >= 60 ? "bg-yellow-500" :
                    "bg-green-500"
                  )}
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                {occupancyRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Desktop/Tablet layout */}
        <div className="hidden md:flex md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
          {/* Left side - Navigation */}
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            {/* Previous/Next buttons */}
            <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-600">
              <button
                onClick={onPrevious}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
                aria-label={`Previous ${viewMode}`}
              >
                <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </button>
              <button
                onClick={onNext}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors border-l border-neutral-200 dark:border-neutral-600"
                aria-label={`Next ${viewMode}`}
              >
                <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Today button */}
            <button
              onClick={onToday}
              className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Today
            </button>

            {/* Date range display */}
            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                {dateRangeText}
              </span>
            </div>
          </div>

          {/* Center - Occupancy */}
          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">Occupancy:</span>
            <div className="flex items-center gap-1">
              <div className="w-20 md:w-32 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full transition-all duration-300",
                    occupancyRate >= 80 ? "bg-red-500" :
                    occupancyRate >= 60 ? "bg-yellow-500" :
                    "bg-green-500"
                  )}
                  style={{ width: `${occupancyRate}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                {occupancyRate}%
              </span>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-600">
              <button
                onClick={() => onViewModeChange("week")}
                className={clsx(
                  "px-2 md:px-3 py-1.5 md:py-2 text-sm font-medium transition-colors flex items-center gap-1",
                  viewMode === "week"
                    ? "bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400"
                    : "hover:bg-neutral-100 dark:hover:bg-dark-3 text-neutral-600 dark:text-neutral-400"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden lg:inline">Week</span>
              </button>
              <button
                onClick={() => onViewModeChange("month")}
                className={clsx(
                  "px-2 md:px-3 py-1.5 md:py-2 text-sm font-medium transition-colors flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-600",
                  viewMode === "month"
                    ? "bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400"
                    : "hover:bg-neutral-100 dark:hover:bg-dark-3 text-neutral-600 dark:text-neutral-400"
                )}
              >
                <CalendarDays className="w-4 h-4" />
                <span className="hidden lg:inline">Month</span>
              </button>
            </div>

            {/* Add booking button */}
            <button
              onClick={onAddBooking}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-1 md:gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline">Add Booking</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})