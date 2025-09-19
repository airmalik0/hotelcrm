import type { BookingPublic, RoomPublic } from "@/client/types.gen"
import { getRoomTypeColor } from "@/utils/booking-colors"
import { formatRoomName } from "@/utils/booking-grid"
import clsx from "clsx"
import {
  eachDayOfInterval,
  endOfDay,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from "date-fns"
import { Calendar, ChevronRight, Clock, Plus, Users } from "lucide-react"
import { useMemo } from "react"

interface MobileBookingListProps {
  rooms: RoomPublic[]
  bookings: BookingPublic[]
  viewStart: Date
  viewEnd: Date
  onBookingClick: (booking: BookingPublic) => void
  onEmptyClick: (room: RoomPublic, checkIn: Date, checkOut: Date) => void
  selectedBookingId: string | undefined
}

export function MobileBookingList({
  rooms,
  bookings,
  viewStart,
  viewEnd,
  onBookingClick,
  onEmptyClick,
  selectedBookingId,
}: MobileBookingListProps) {
  // Group bookings by day
  const bookingsByDay = useMemo(() => {
    const days = eachDayOfInterval({ start: viewStart, end: viewEnd })
    const dayMap = new Map<string, { date: Date; bookings: BookingPublic[] }>()

    days.forEach((day) => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      const dayKey = format(day, "yyyy-MM-dd")

      const dayBookings = bookings.filter((booking) => {
        const checkIn = new Date(booking.check_in)
        const checkOut = new Date(booking.check_out)

        // Check if booking overlaps with this day
        return (
          isWithinInterval(day, { start: checkIn, end: checkOut }) ||
          isSameDay(day, checkIn) ||
          isSameDay(day, checkOut)
        )
      })

      dayMap.set(dayKey, { date: day, bookings: dayBookings })
    })

    return Array.from(dayMap.values())
  }, [bookings, viewStart, viewEnd])

  // Get available rooms for a specific day
  const getAvailableRoomsForDay = (date: Date) => {
    const dayBookings = bookings.filter((booking) => {
      const checkIn = new Date(booking.check_in)
      const checkOut = new Date(booking.check_out)
      return (
        isWithinInterval(date, { start: checkIn, end: checkOut }) ||
        isSameDay(date, checkIn) ||
        isSameDay(date, checkOut)
      )
    })

    const bookedRoomIds = new Set(dayBookings.map((b) => b.room_id))
    return rooms.filter((room) => !bookedRoomIds.has(room.id))
  }

  const today = new Date()

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-dark-1">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {bookingsByDay.map(({ date, bookings: dayBookings }) => {
          const availableRooms = getAvailableRoomsForDay(date)
          const isToday = isSameDay(date, today)

          return (
            <div key={format(date, "yyyy-MM-dd")} className="space-y-3">
              {/* Day header */}
              <div
                className={clsx(
                  "sticky top-0 z-10 bg-white dark:bg-dark-2 px-4 py-3 rounded-lg border",
                  isToday
                    ? "border-primary-500 dark:border-primary-600"
                    : "border-neutral-200 dark:border-neutral-600",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                      {format(date, "EEEE")}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {format(date, "MMM d, yyyy")}
                      {isToday && (
                        <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">
                          Today
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {dayBookings.length} bookings
                    </p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      {availableRooms.length} rooms available
                    </p>
                  </div>
                </div>
              </div>

              {/* Bookings for this day */}
              {dayBookings.length > 0 ? (
                <div className="space-y-2">
                  {dayBookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => onBookingClick(booking)}
                      className={clsx(
                        "w-full text-left p-4 rounded-lg border transition-all",
                        "hover:border-primary-300 dark:hover:border-primary-700",
                        "hover:shadow-md",
                        selectedBookingId === booking.id
                          ? "border-primary-500 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                          : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-dark-2",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={clsx(
                                "text-xs px-2 py-1 rounded-full",
                                getRoomTypeColor(
                                  booking.room?.room_type || "standard",
                                ),
                              )}
                            >
                              {formatRoomName(booking.room!)}
                            </span>
                            <span
                              className={clsx(
                                "text-xs px-2 py-1 rounded",
                                booking.status === "confirmed"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : booking.status === "checked_in"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : booking.status === "checked_out"
                                      ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                              )}
                            >
                              {booking.status.replace("_", " ")}
                            </span>
                          </div>

                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {booking.customer?.first_name}{" "}
                              {booking.customer?.last_name}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {format(new Date(booking.check_in), "MMM d")} -
                                {format(new Date(booking.check_out), "MMM d")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-neutral-400 dark:text-neutral-600 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No bookings for this day</p>
                  {availableRooms.length > 0 && (
                    <button
                      onClick={() => {
                        const firstRoom = availableRooms[0]
                        onEmptyClick(firstRoom, date, date)
                      }}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Booking
                    </button>
                  )}
                </div>
              )}

              {/* Available rooms summary */}
              {availableRooms.length > 0 && dayBookings.length > 0 && (
                <div className="px-4 py-3 bg-neutral-100 dark:bg-dark-3 rounded-lg">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Available Rooms ({availableRooms.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableRooms.slice(0, 5).map((room) => (
                      <button
                        key={room.id}
                        onClick={() => onEmptyClick(room, date, date)}
                        className="text-xs px-3 py-1.5 bg-white dark:bg-dark-2 rounded-full border border-neutral-200 dark:border-neutral-600 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                      >
                        {formatRoomName(room)}
                      </button>
                    ))}
                    {availableRooms.length > 5 && (
                      <span className="text-xs px-3 py-1.5 text-neutral-500 dark:text-neutral-400">
                        +{availableRooms.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
