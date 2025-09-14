import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Calendar, Plus, LayoutGrid, CalendarDays } from "lucide-react"
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
}

export function GridHeader({
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
}: GridHeaderProps) {
  const dateRangeText = viewMode === "week"
    ? `${format(viewStart, "MMM d")} - ${format(viewEnd, "MMM d, yyyy")}`
    : format(currentDate, "MMMM yyyy")

  return (
    <div className="bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Navigation */}
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Occupancy:</span>
          <div className="flex items-center gap-1">
            <div className="w-32 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
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
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-600">
            <button
              onClick={() => onViewModeChange("week")}
              className={clsx(
                "px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1",
                viewMode === "week"
                  ? "bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400"
                  : "hover:bg-neutral-100 dark:hover:bg-dark-3 text-neutral-600 dark:text-neutral-400"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Week
            </button>
            <button
              onClick={() => onViewModeChange("month")}
              className={clsx(
                "px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-600",
                viewMode === "month"
                  ? "bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400"
                  : "hover:bg-neutral-100 dark:hover:bg-dark-3 text-neutral-600 dark:text-neutral-400"
              )}
            >
              <CalendarDays className="w-4 h-4" />
              Month
            </button>
          </div>

          {/* Add booking button */}
          <button
            onClick={onAddBooking}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Booking
          </button>
        </div>
      </div>
    </div>
  )
}