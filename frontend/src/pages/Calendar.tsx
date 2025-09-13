import { CalendarGrid } from "@/components/calendar/CalendarGrid"
import { CalendarHeader } from "@/components/calendar/CalendarHeader"
import { RoomSidebar } from "@/components/calendar/RoomSidebar"
import { TimeScale } from "@/components/calendar/TimeScale"
import { useCalendarData, useCalendarView } from "@/hooks/useCalendarData"
import { useRole } from "@/hooks/useRole"
import type { CalendarViewMode } from "@/types/booking"
import { getCalendarPeriodLabel } from "@/utils/calendar"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import type React from "react"
import { useState } from "react"

export function Calendar() {
  const { hasAnyRole } = useRole()
  const canEdit = hasAnyRole(["admin", "manager"])
  const canCreate = hasAnyRole(["admin", "manager", "host"])

  // Calendar view state
  const {
    viewMode,
    currentDate,
    navigatePrevious,
    navigateNext,
    navigateToday,
    changeViewMode
  } = useCalendarView("week")

  // Fetch calendar data
  const { rooms, bookings, isLoading, error, refetch } = useCalendarData({
    viewMode,
    currentDate,
    autoRefresh: true,
    refreshInterval: 30000 // Refresh every 30 seconds
  })

  // Filter state
  const [selectedRoomType, setSelectedRoomType] = useState<"all" | "standard" | "vip">("all")
  const [selectedFloor, setSelectedFloor] = useState<number | "all">("all")

  // Filter rooms based on selection
  const filteredRooms = rooms.filter(room => {
    if (selectedRoomType !== "all" && room.room_type !== selectedRoomType) {
      return false
    }
    if (selectedFloor !== "all" && room.floor !== selectedFloor) {
      return false
    }
    return true
  })

  // Filter bookings to only show those for filtered rooms
  const filteredBookings = bookings.filter(booking =>
    filteredRooms.some(room => room.id === booking.room_id)
  )

  const periodLabel = getCalendarPeriodLabel(viewMode, currentDate)

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Error loading calendar data
          </p>
          <button
            onClick={() => refetch()}
            className="rounded-lg px-4 py-2 bg-primary-600 text-white hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                Booking Calendar
              </h1>
              <span className="text-lg text-neutral-600 dark:text-neutral-400">
                {periodLabel}
              </span>
            </div>
            {isLoading && (
              <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
            )}
          </div>

          <CalendarHeader
            viewMode={viewMode}
            onViewModeChange={changeViewMode}
            onNavigatePrevious={navigatePrevious}
            onNavigateNext={navigateNext}
            onNavigateToday={navigateToday}
            selectedRoomType={selectedRoomType}
            onRoomTypeChange={setSelectedRoomType}
            selectedFloor={selectedFloor}
            onFloorChange={setSelectedFloor}
            availableFloors={[...new Set(rooms.map(r => r.floor))].sort()}
            canCreate={canCreate}
          />
        </div>
      </div>

      {/* Calendar Body */}
      <div className="flex-1 flex overflow-hidden bg-neutral-50 dark:bg-dark-1">
        {isLoading && rooms.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">
                Loading calendar...
              </p>
            </div>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <CalendarIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400">
                No rooms match your filters
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Room Sidebar */}
            <div className="flex-shrink-0 w-48 bg-white dark:bg-dark-2 border-r border-neutral-200 dark:border-neutral-600">
              <RoomSidebar rooms={filteredRooms} />
            </div>

            {/* Calendar Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Time Scale */}
              <div className="flex-shrink-0 h-12 bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600">
                <TimeScale
                  viewMode={viewMode}
                  currentDate={currentDate}
                />
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 overflow-auto">
                <CalendarGrid
                  rooms={filteredRooms}
                  bookings={filteredBookings}
                  viewMode={viewMode}
                  currentDate={currentDate}
                  canEdit={canEdit}
                  canCreate={canCreate}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}