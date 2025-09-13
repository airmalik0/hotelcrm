import type { CalendarViewMode } from "@/types/booking"
import type { RoomType } from "@/client/types.gen"
import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
  Calendar
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
  canCreate
}: CalendarHeaderProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="space-y-3">
      {/* Main Controls */}
      <div className="flex items-center justify-between">
        {/* View Mode & Navigation */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-600">
            <button
              onClick={() => onViewModeChange("week")}
              className={`
                px-4 py-2 text-sm font-medium rounded-l-lg transition-colors
                ${viewMode === "week"
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-dark-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-3"
                }
              `}
            >
              <CalendarDays className="w-4 h-4 inline mr-2" />
              Week
            </button>
            <button
              onClick={() => onViewModeChange("month")}
              className={`
                px-4 py-2 text-sm font-medium rounded-r-lg transition-colors
                ${viewMode === "month"
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-dark-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-3"
                }
              `}
            >
              <CalendarRange className="w-4 h-4 inline mr-2" />
              Month
            </button>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onNavigatePrevious}
              className="p-2 rounded-lg bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
              title="Previous period"
            >
              <ChevronLeft className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </button>
            <button
              onClick={onNavigateToday}
              className="px-3 py-2 rounded-lg bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
              title="Go to today"
            >
              <Calendar className="w-4 h-4 text-neutral-700 dark:text-neutral-300 inline mr-2" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Today
              </span>
            </button>
            <button
              onClick={onNavigateNext}
              className="p-2 rounded-lg bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
              title="Next period"
            >
              <ChevronRight className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              px-4 py-2 rounded-lg border transition-colors
              ${showFilters
                ? "bg-primary-50 dark:bg-primary-600/25 border-primary-200 dark:border-primary-600/50 text-primary-700 dark:text-primary-400"
                : "bg-white dark:bg-dark-2 border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-dark-3"
              }
            `}
          >
            <Filter className="w-4 h-4 inline mr-2" />
            Filters
            {(selectedRoomType !== "all" || selectedFloor !== "all") && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-600 text-white rounded-full">
                {[selectedRoomType !== "all" && 1, selectedFloor !== "all" && 1].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
            title="Refresh calendar"
          >
            <RefreshCw className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          </button>

          {/* Add Booking Button */}
          {canCreate && (
            <button
              onClick={() => {/* Will implement with QuickBookingModal */}}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              New Booking
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-dark-3 rounded-lg border border-neutral-200 dark:border-neutral-600">
          {/* Room Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Room Type:
            </label>
            <select
              value={selectedRoomType}
              onChange={(e) => onRoomTypeChange(e.target.value as "all" | RoomType)}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-500 bg-white dark:bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          {/* Floor Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Floor:
            </label>
            <select
              value={selectedFloor}
              onChange={(e) => {
                const value = e.target.value
                onFloorChange(value === "all" ? "all" : parseInt(value))
              }}
              className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-500 bg-white dark:bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Floors</option>
              {availableFloors.map(floor => (
                <option key={floor} value={floor}>
                  Floor {floor}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(selectedRoomType !== "all" || selectedFloor !== "all") && (
            <button
              onClick={() => {
                onRoomTypeChange("all")
                onFloorChange("all")
              }}
              className="px-3 py-1.5 text-sm rounded-lg bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}