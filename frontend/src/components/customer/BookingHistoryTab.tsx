import { getBookings } from "@/api/bookings"
import type { BookingPublic, BookingStatus } from "@/client/types.gen"
import { safeParseDate } from "@/utils/date-helpers"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowDownUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Filter,
  Home,
  Search,
  X,
} from "lucide-react"
import { useMemo, useState } from "react"

interface BookingHistoryTabProps {
  customerId: string
}

type SortField = "check_in" | "total_amount" | "status" | "booking_date"
type SortOrder = "asc" | "desc"

const statusConfig = {
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-600/30 dark:text-blue-400",
    dotColor: "bg-blue-500",
  },
  checked_in: {
    label: "Checked In",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
  },
  checked_out: {
    label: "Checked Out",
    color:
      "bg-neutral-100 text-neutral-700 dark:bg-neutral-600/30 dark:text-neutral-400",
    dotColor: "bg-neutral-500",
  },
  cancelled: {
    label: "Cancelled",
    color:
      "bg-danger-100 text-danger-700 dark:bg-danger-600/30 dark:text-danger-400",
    dotColor: "bg-danger-500",
  },
}

export function BookingHistoryTab({ customerId }: BookingHistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all")
  const [sortField, setSortField] = useState<SortField>("check_in")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch bookings for this customer
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ["bookings", customerId],
    queryFn: () => getBookings({ customer_id: customerId, limit: 500 }),
  })

  const bookings = bookingsData?.data || []

  // Filter and sort bookings
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = [...bookings]

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.room?.room_number
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          booking.id.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortField) {
        case "check_in":
          aValue = safeParseDate(a.check_in).getTime()
          bValue = safeParseDate(b.check_in).getTime()
          break
        case "total_amount":
          aValue = a.total_amount
          bValue = b.total_amount
          break
        case "status":
          aValue = a.status || ""
          bValue = b.status || ""
          break
        case "booking_date":
          aValue = safeParseDate(a.booking_date).getTime()
          bValue = safeParseDate(b.booking_date).getTime()
          break
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      }
      return aValue < bValue ? 1 : -1
    })

    return filtered
  }, [bookings, statusFilter, searchTerm, sortField, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedBookings.length / itemsPerPage)
  const paginatedBookings = filteredAndSortedBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const formatDate = (date: string) => {
    return safeParseDate(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const calculateNights = (checkIn: string, checkOut: string) => {
    // Calculate nights the same way as backend: difference in days only
    const checkInDate = safeParseDate(checkIn)
    const checkOutDate = safeParseDate(checkOut)
    const startDate = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())
    const endDate = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate())
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading booking history...
        </div>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
          <Calendar className="w-10 h-10 text-neutral-400" />
        </div>
        <p className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          No Bookings Yet
        </p>
        <p className="text-neutral-600 dark:text-neutral-400">
          This customer hasn't made any bookings.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by room or booking ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as BookingStatus | "all")
            }
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked_in">Checked In</option>
            <option value="checked_out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => handleSort(sortField)}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-dark-2 transition-colors flex items-center gap-2"
          >
            <ArrowDownUp className="w-4 h-4" />
            Sort
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Total Bookings
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {bookings.length}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-600/30 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
            Confirmed
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {bookings.filter((b) => b.status === "confirmed").length}
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-600/30 rounded-lg p-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
            Completed
          </p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {bookings.filter((b) => b.status === "checked_out").length}
          </p>
        </div>
        <div className="bg-danger-100 dark:bg-danger-600/30 rounded-lg p-4">
          <p className="text-sm text-danger-600 dark:text-danger-400 mb-1">
            Cancelled
          </p>
          <p className="text-2xl font-bold text-danger-700 dark:text-danger-400">
            {bookings.filter((b) => b.status === "cancelled").length}
          </p>
        </div>
      </div>

      {/* Bookings List */}
      {filteredAndSortedBookings.length === 0 ? (
        <div className="text-center py-8">
          <Filter className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
          <p className="text-neutral-600 dark:text-neutral-400">
            No bookings match your filters
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedBookings.map((booking) => {
              const status = booking.status || "confirmed"
              const config = statusConfig[status as keyof typeof statusConfig]
              const nights = calculateNights(
                booking.check_in,
                booking.check_out,
              )

              return (
                <div
                  key={booking.id}
                  className="bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 hover:shadow-md dark:hover:shadow-none transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left side - booking details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h6 className="font-semibold text-neutral-900 dark:text-white">
                              Room {booking.room?.room_number || "N/A"}
                            </h6>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`}
                              />
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                            Booking ID: {booking.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-neutral-900 dark:text-white">
                            {formatCurrency(booking.total_amount)}
                          </p>
                          {booking.discount && booking.discount > 0 && (
                            <p className="text-xs text-danger-600 dark:text-danger-400">
                              -{booking.discount}% discount
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Check-in
                            </p>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {formatDate(booking.check_in)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Check-out
                            </p>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {formatDate(booking.check_out)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-neutral-400" />
                          <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Duration
                            </p>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {nights} {nights === 1 ? "night" : "nights"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-neutral-400" />
                          <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Room Type
                            </p>
                            <p className="font-medium text-neutral-900 dark:text-white">
                              {booking.room?.room_type || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(
                  currentPage * itemsPerPage,
                  filteredAndSortedBookings.length,
                )}{" "}
                of {filteredAndSortedBookings.length} bookings
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-dark-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1,
                    )
                    .map((page, index, array) => (
                      <>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span
                            key={`ellipsis-${page}`}
                            className="px-2 py-1 text-neutral-500"
                          >
                            ...
                          </span>
                        )}
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            currentPage === page
                              ? "bg-primary-600 text-white"
                              : "hover:bg-neutral-50 dark:hover:bg-dark-3 text-neutral-700 dark:text-neutral-300"
                          }`}
                        >
                          {page}
                        </button>
                      </>
                    ))}
                </div>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-dark-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
