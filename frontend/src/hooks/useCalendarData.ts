import { getBookings } from "@/api/bookings"
import { getRooms } from "@/api/rooms"
import type { BookingPublic, RoomPublic } from "@/client/types.gen"
import type { BookingWithPosition, CalendarViewMode } from "@/types/booking"
import {
  getMonthEnd,
  getMonthStart,
  getWeekEnd,
  getWeekStart,
} from "@/types/booking"
import { processBookingsForCalendar } from "@/utils/calendar"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

interface CalendarData {
  rooms: RoomPublic[]
  bookings: BookingWithPosition[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

interface UseCalendarDataOptions {
  viewMode: CalendarViewMode
  currentDate: Date
  autoRefresh?: boolean
  refreshInterval?: number
}

/**
 * Hook to fetch and process calendar data
 */
export function useCalendarData({
  viewMode,
  currentDate,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
}: UseCalendarDataOptions): CalendarData {
  const queryClient = useQueryClient()

  // Calculate view period based on mode
  const { viewStart, viewEnd } = useMemo(() => {
    if (viewMode === "week") {
      return {
        viewStart: getWeekStart(currentDate),
        viewEnd: getWeekEnd(currentDate),
      }
    }
    return {
      viewStart: getMonthStart(currentDate),
      viewEnd: getMonthEnd(currentDate),
    }
  }, [viewMode, currentDate])

  // Fetch rooms
  const {
    data: roomsData,
    isLoading: roomsLoading,
    error: roomsError,
  } = useQuery({
    queryKey: ["rooms", "calendar"],
    queryFn: () => getRooms({ limit: 100 }),
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchInterval: autoRefresh ? refreshInterval : false,
  })

  // Fetch bookings for the period
  const {
    data: bookingsData,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: [
      "bookings",
      "calendar",
      viewStart.toISOString(),
      viewEnd.toISOString(),
    ],
    queryFn: () => getBookings({ limit: 500 }), // High limit to get all bookings
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    refetchInterval: autoRefresh ? refreshInterval : false,
  })

  // Process bookings for calendar display
  const processedBookings = useMemo(() => {
    if (!bookingsData?.data || !roomsData?.data) {
      return []
    }

    // Filter bookings that overlap with the view period
    const relevantBookings = bookingsData.data.filter((booking) => {
      const checkIn = new Date(booking.check_in)
      const checkOut = new Date(booking.check_out)
      return checkOut > viewStart && checkIn < viewEnd
    })

    return processBookingsForCalendar(
      relevantBookings,
      roomsData.data,
      viewStart,
      viewEnd,
    )
  }, [bookingsData?.data, roomsData?.data, viewStart, viewEnd])

  // Set up real-time refetch (can be enhanced with WebSocket later)
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] })
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, queryClient])

  // Combined refetch function
  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["rooms", "calendar"] })
    queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] })
  }

  return {
    rooms: roomsData?.data || [],
    bookings: processedBookings,
    isLoading: roomsLoading || bookingsLoading,
    error: roomsError || bookingsError,
    refetch,
  }
}

/**
 * Hook to manage calendar view state
 */
export function useCalendarView(initialMode: CalendarViewMode = "week") {
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialMode)
  const [currentDate, setCurrentDate] = useState(new Date())

  const navigatePrevious = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (viewMode === "week") {
        newDate.setDate(newDate.getDate() - 7)
      } else {
        newDate.setMonth(newDate.getMonth() - 1)
      }
      return newDate
    })
  }

  const navigateNext = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (viewMode === "week") {
        newDate.setDate(newDate.getDate() + 7)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateToday = () => {
    setCurrentDate(new Date())
  }

  const changeViewMode = (mode: CalendarViewMode) => {
    setViewMode(mode)
  }

  return {
    viewMode,
    currentDate,
    navigatePrevious,
    navigateNext,
    navigateToday,
    changeViewMode,
  }
}

/**
 * Hook to handle booking selection and actions
 */
export function useBookingSelection() {
  const [selectedBooking, setSelectedBooking] = useState<BookingPublic | null>(
    null,
  )
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const selectBooking = (booking: BookingPublic) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const editBooking = (booking: BookingPublic) => {
    setSelectedBooking(booking)
    setIsEditModalOpen(true)
    setIsDetailModalOpen(false)
  }

  const closeModals = () => {
    setIsDetailModalOpen(false)
    setIsEditModalOpen(false)
    // Keep selected booking for animation purposes
    setTimeout(() => setSelectedBooking(null), 300)
  }

  return {
    selectedBooking,
    isDetailModalOpen,
    isEditModalOpen,
    selectBooking,
    editBooking,
    closeModals,
  }
}
