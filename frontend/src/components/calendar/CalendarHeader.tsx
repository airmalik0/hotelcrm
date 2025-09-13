import type { RoomType } from "@/client/types.gen"
import type { CalendarViewMode } from "@/types/booking"
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
} from "lucide-react"
import type React from "react"
import { useState } from "react"

interface CalendarHeaderProps {
  viewMode: CalendarViewMode
  onViewModeChange: (mode: CalendarViewMode) => void
  onNavigatePrevious: () => void
  onNavigateNext: () => void
  onNavigateToday: () => void
  selectedRoomType: "all" | RoomType
  onRoomTypeChange: (type: "all" | RoomType) => void
  selectedFloor: number | "all"
  onFloorChange: (floor: number | "all") => void
  availableFloors: number[]
  canCreate: boolean
  onNewBooking?: () => void
}

export function CalendarHeader({
  viewMode,
  onViewModeChange,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToday,
  selectedRoomType,
  onRoomTypeChange,
  selectedFloor,
  onFloorChange,
  availableFloors,
  canCreate,
  onNewBooking,
}: CalendarHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-2">
      {/* Main Controls */}
      <div className="flex items-center justify-between">
        {/* Left side: Navigation and View Mode */}
        <div className="flex items-center gap-3">
          {/* Navigation Buttons */}
          <div className="flex items-center">
            <button
              onClick={onNavigatePrevious}
              className="p-1.5 rounded-l-md border border-r-0 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-dark-3 hover:bg-neutral-50 dark:hover:bg-dark-2 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
            <button
              onClick={onNavigateToday}
              className="px-3 py-1.5 border-y border-neutral-300 dark:border-neutral-600 bg-white dark:bg-dark-3 hover:bg-neutral-50 dark:hover:bg-dark-2 transition-colors"
              title="Today"
            >
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Today
              </span>
            </button>
            <button
              onClick={onNavigateNext}
              className="p-1.5 rounded-r-md border border-l-0 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-dark-3 hover:bg-neutral-50 dark:hover:bg-dark-2 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-md border border-neutral-300 dark:border-neutral-600 overflow-hidden">
            <button
              onClick={() => onViewModeChange("week")}
              className={`
                px-3 py-1.5 text-sm font-medium transition-colors
                ${
                  viewMode === "week"
                    ? "bg-primary-600 text-white"
                    : "bg-white dark:bg-dark-3 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-2"
                }
              `}
            >
              Week
            </button>
            <button
              onClick={() => onViewModeChange("month")}
              className={`
                px-3 py-1.5 text-sm font-medium transition-colors border-l border-neutral-300 dark:border-neutral-600
                ${
                  viewMode === "month"
                    ? "bg-primary-600 text-white"
                    : "bg-white dark:bg-dark-3 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-2"
                }
              `}
            >
              Month
            </button>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              px-3 py-1.5 rounded-md text-sm border transition-colors
              ${
                showFilters
                  ? "bg-primary-50 dark:bg-primary-600/25 border-primary-300 dark:border-primary-600/50 text-primary-700 dark:text-primary-400"
                  : "bg-white dark:bg-dark-3 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-2"
              }
            `}
          >
            <Filter className="w-3.5 h-3.5 inline mr-1.5" />
            Filters
            {(selectedRoomType !== "all" || selectedFloor !== "all") && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                {
                  [
                    selectedRoomType !== "all" && 1,
                    selectedFloor !== "all" && 1,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </button>

          {/* Add Booking Button */}
          {canCreate && (
            <button
              onClick={onNewBooking}
              className="px-3 py-1.5 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!onNewBooking}
            >
              <Plus className="w-3.5 h-3.5 inline mr-1.5" />
              New Booking
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-dark-3/50 rounded-md border border-neutral-200 dark:border-neutral-600">
          {/* Room Type */}
          <select
            value={selectedRoomType}
            onChange={(e) =>
              onRoomTypeChange(e.target.value as "all" | RoomType)
            }
            className="px-2.5 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-500 bg-white dark:bg-dark-2 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Room Types</option>
            <option value="standard">Standard</option>
            <option value="vip">VIP</option>
          </select>

          {/* Floor */}
          <select
            value={selectedFloor}
            onChange={(e) => {
              const value = e.target.value
              onFloorChange(value === "all" ? "all" : Number.parseInt(value))
            }}
            className="px-2.5 py-1 text-sm rounded border border-neutral-300 dark:border-neutral-500 bg-white dark:bg-dark-2 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Floors</option>
            {availableFloors.map((floor) => (
              <option key={floor} value={floor}>
                Floor {floor}
              </option>
            ))}
          </select>

          {/* Clear */}
          {(selectedRoomType !== "all" || selectedFloor !== "all") && (
            <button
              onClick={() => {
                onRoomTypeChange("all")
                onFloorChange("all")
              }}
              className="px-2.5 py-1 text-sm rounded bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
