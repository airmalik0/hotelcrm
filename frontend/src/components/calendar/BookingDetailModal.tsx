import { deleteBooking, updateBooking, updateBookingStatus } from "@/api/bookings"
import { getCustomers } from "@/api/customers"
import type { BookingPublic, BookingStatus } from "@/client/types.gen"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { calculateDurationHours, formatDateTime, getBookingStatusColor } from "@/types/booking"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CalendarDays,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  LogIn,
  LogOut,
  MapPin,
  Trash2,
  User,
  X,
  XCircle
} from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"

interface BookingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingPublic
  canEdit: boolean
}

export function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  canEdit
}: BookingDetailModalProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    check_in: booking.check_in.slice(0, 16),
    check_out: booking.check_out.slice(0, 16),
    customer_id: booking.customer_id,
    total_amount: booking.total_amount
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch customers for editing
  const { data: customersData } = useQuery({
    queryKey: ["customers", "search"],
    queryFn: () => getCustomers({ limit: 100 }),
    enabled: isEditing
  })

  // Customer options for SearchableSelect
  const customerOptions = useMemo(() => {
    if (!customersData?.data) return []

    return customersData.data.map(customer => ({
      value: customer.id,
      label: `${customer.first_name} ${customer.last_name}${customer.phone ? ` (${customer.phone})` : ""}`
    }))
  }, [customersData])

  // Calculated values
  const duration = calculateDurationHours(booking.check_in, booking.check_out)
  const checkInDate = new Date(booking.check_in)
  const checkOutDate = new Date(booking.check_out)
  const statusColor = getBookingStatusColor(booking.status)

  // Update booking mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => updateBooking(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] })
      setIsEditing(false)
      setErrors({})
    },
    onError: (error: any) => {
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === "string") {
          setErrors({ general: error.response.data.detail })
        } else if (Array.isArray(error.response.data.detail)) {
          const fieldErrors: Record<string, string> = {}
          error.response.data.detail.forEach((err: any) => {
            const field = err.loc?.[err.loc.length - 1]
            if (field) {
              fieldErrors[field] = err.msg
            }
          })
          setErrors(fieldErrors)
        }
      } else {
        setErrors({ general: "Failed to update booking" })
      }
    }
  })

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: (status: BookingStatus) => updateBookingStatus(booking.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] })
    }
  })

  // Delete booking mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteBooking(booking.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] })
      onClose()
    }
  })

  // Handle edit submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}

    if (!editData.customer_id) {
      newErrors.customer_id = "Please select a customer"
    }

    const checkInDate = new Date(editData.check_in)
    const checkOutDate = new Date(editData.check_out)

    if (checkInDate >= checkOutDate) {
      newErrors.check_out = "Check-out must be after check-in"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    updateMutation.mutate({
      check_in: new Date(editData.check_in).toISOString(),
      check_out: new Date(editData.check_out).toISOString(),
      customer_id: editData.customer_id,
      total_amount: editData.total_amount
    })
  }

  // Handle status actions
  const handleStatusChange = (newStatus: BookingStatus) => {
    statusMutation.mutate(newStatus)
  }

  // Handle delete
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
      deleteMutation.mutate()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-2 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusColor.includes('bg-blue') ? 'bg-blue-500' : statusColor.includes('bg-green') ? 'bg-green-500' : statusColor.includes('bg-red') ? 'bg-red-500' : 'bg-neutral-500'}`} />
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Booking Details
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {booking.room?.room_number ? `Room ${booking.room.room_number}` : "Unknown Room"}
                  {booking.room?.floor && ` • Floor ${booking.room.floor}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.general}
              </p>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Customer *
                </label>
                <SearchableSelect
                  value={editData.customer_id}
                  onChange={(value) => setEditData(prev => ({ ...prev, customer_id: value || "" }))}
                  options={customerOptions}
                  placeholder="Search and select customer"
                  error={errors.customer_id}
                  icon={<User className="w-4 h-4" />}
                />
              </div>

              {/* Check-in Date/Time */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Check-in *
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="datetime-local"
                    value={editData.check_in}
                    onChange={(e) => setEditData(prev => ({ ...prev, check_in: e.target.value }))}
                    className={`
                      w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors
                      ${errors.check_in
                        ? "border-red-300 dark:border-red-600"
                        : "border-neutral-300 dark:border-neutral-600"
                      }
                      bg-white dark:bg-transparent
                      focus:outline-none focus:ring-2 focus:ring-primary-500
                    `}
                    required
                  />
                </div>
              </div>

              {/* Check-out Date/Time */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Check-out *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="datetime-local"
                    value={editData.check_out}
                    onChange={(e) => setEditData(prev => ({ ...prev, check_out: e.target.value }))}
                    className={`
                      w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors
                      ${errors.check_out
                        ? "border-red-300 dark:border-red-600"
                        : "border-neutral-300 dark:border-neutral-600"
                      }
                      bg-white dark:bg-transparent
                      focus:outline-none focus:ring-2 focus:ring-primary-500
                    `}
                    required
                  />
                </div>
                {errors.check_out && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.check_out}
                  </p>
                )}
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Total Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editData.total_amount}
                    onChange={(e) => setEditData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) }))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Edit Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setErrors({})
                    setEditData({
                      check_in: booking.check_in.slice(0, 16),
                      check_out: booking.check_out.slice(0, 16),
                      customer_id: booking.customer_id,
                      total_amount: booking.total_amount
                    })
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-dark-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-600/25 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    {booking.customer ? `${booking.customer.first_name} ${booking.customer.last_name}` : "Unknown Customer"}
                  </h3>
                  {booking.customer?.phone && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {booking.customer.phone}
                    </p>
                  )}
                  {booking.customer?.date_of_birth && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      DOB: {new Date(booking.customer.date_of_birth).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-neutral-900 dark:text-white">Check-in</h4>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <CalendarDays className="w-4 h-4" />
                    {formatDateTime(checkInDate)}
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-neutral-900 dark:text-white">Check-out</h4>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(checkOutDate)}
                  </div>
                </div>
              </div>

              {/* Duration & Payment */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-neutral-900 dark:text-white">Duration</h4>
                  <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Clock className="w-4 h-4" />
                    {duration.toFixed(1)} hours
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-neutral-900 dark:text-white">Total Amount</h4>
                  <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                    <DollarSign className="w-5 h-5" />
                    ${booking.total_amount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Room Info */}
              {booking.room && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-50 dark:bg-dark-3">
                  <MapPin className="w-5 h-5 text-neutral-400" />
                  <div>
                    <h4 className="font-medium text-neutral-900 dark:text-white">
                      Room {booking.room.room_number}
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Floor {booking.room.floor} • {booking.room.room_type.toUpperCase()} • ${booking.room.price_per_night}/night
                    </p>
                  </div>
                </div>
              )}

              {/* Status Actions */}
              {canEdit && (
                <div className="space-y-3">
                  <h4 className="font-medium text-neutral-900 dark:text-white">Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    {booking.status === "confirmed" && (
                      <button
                        onClick={() => handleStatusChange("checked_in")}
                        disabled={statusMutation.isPending}
                        className="px-3 py-1.5 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-600/25 dark:text-green-400 dark:hover:bg-green-600/40 transition-colors disabled:opacity-50"
                      >
                        <LogIn className="w-4 h-4 inline mr-1" />
                        Check In
                      </button>
                    )}

                    {booking.status === "checked_in" && (
                      <button
                        onClick={() => handleStatusChange("checked_out")}
                        disabled={statusMutation.isPending}
                        className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-600/25 dark:text-blue-400 dark:hover:bg-blue-600/40 transition-colors disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4 inline mr-1" />
                        Check Out
                      </button>
                    )}

                    {(booking.status === "confirmed" || booking.status === "checked_in") && (
                      <button
                        onClick={() => handleStatusChange("cancelled")}
                        disabled={statusMutation.isPending}
                        className="px-3 py-1.5 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-600/25 dark:text-red-400 dark:hover:bg-red-600/40 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 inline mr-1" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <div className="flex justify-between">
            {/* Left side - Delete button */}
            <div>
              {canEdit && !isEditing && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-600/10 dark:text-red-400 dark:hover:bg-red-600/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>

            {/* Right side - Edit/Close buttons */}
            <div className="flex gap-3">
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors"
                >
                  <Edit className="w-4 h-4 inline mr-2" />
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}