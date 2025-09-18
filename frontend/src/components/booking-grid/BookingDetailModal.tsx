import {
  checkInBooking,
  checkOutBooking,
  deleteBooking,
  getBooking,
  updateBooking,
} from "@/api/bookings"
import type { BookingPublic, BookingUpdate } from "@/client/types.gen"
import { useRole } from "@/hooks/useRole"
import {
  invalidateAfterBookingCancel,
  invalidateAfterBookingUpdate,
  invalidateAfterCheckIn,
  invalidateAfterCheckOut,
} from "@/utils/query-invalidation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import { format } from "date-fns"
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Edit2,
  Home,
  LogIn,
  LogOut,
  Save,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
  XCircle,
} from "lucide-react"
import { memo, useEffect, useState } from "react"

interface BookingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string | null
}

export const BookingDetailModal = memo(function BookingDetailModal({
  isOpen,
  onClose,
  bookingId,
}: BookingDetailModalProps) {
  const queryClient = useQueryClient()
  const { canDeleteBookings, canUpdateDiscount, canCheckInOut } = useRole()
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Form state for editing
  const [formData, setFormData] = useState<{
    totalAmount: number
    discount: number
    discountReason: string
    paymentMethod: "cash" | "transfer" | "terminal"
  }>({
    totalAmount: 0,
    discount: 0,
    discountReason: "",
    paymentMethod: "cash",
  })

  // Fetch booking details
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => (bookingId ? getBooking(bookingId) : null),
    enabled: !!bookingId && isOpen,
  })

  // Set form data when booking loads
  useEffect(() => {
    if (booking) {
      setFormData({
        totalAmount: booking.total_amount,
        discount: booking.discount || 0,
        discountReason: booking.discount_reason || "",
        paymentMethod: booking.payment_method || "cash",
      })
    }
  }, [booking])

  // Update booking mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BookingUpdate }) =>
      updateBooking(id, data),
    onSuccess: (updatedBooking) => {
      // Check what changed to properly invalidate
      const roomChanged = booking?.room_id !== updatedBooking.room_id
      const customerChanged =
        booking?.customer_id !== updatedBooking.customer_id

      invalidateAfterBookingUpdate(queryClient, updatedBooking.id, {
        roomChanged,
        customerChanged,
        oldRoomId: booking?.room_id,
        newRoomId: updatedBooking.room_id,
        oldCustomerId: booking?.customer_id,
        newCustomerId: updatedBooking.customer_id,
      })
      setIsEditing(false)
    },
  })

  // Delete booking mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      // When deleting, we need to update customer stats and potentially room status
      if (booking) {
        invalidateAfterBookingCancel(
          queryClient,
          booking.id,
          booking.customer_id,
          booking.room_id,
          booking.status === "checked_in",
        )
      }
      onClose()
    },
  })

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (id: string) => checkInBooking(id),
    onSuccess: (updatedBooking) => {
      // Check-in changes room status to OCCUPIED
      invalidateAfterCheckIn(
        queryClient,
        updatedBooking.id,
        updatedBooking.room_id,
      )
    },
  })

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: (id: string) => checkOutBooking(id),
    onSuccess: (updatedBooking) => {
      // Check-out changes room status to CLEANING
      invalidateAfterCheckOut(
        queryClient,
        updatedBooking.id,
        updatedBooking.room_id,
      )
    },
  })

  const handleSave = () => {
    if (!booking) return

    const updateData: BookingUpdate = {
      total_amount: formData.totalAmount,
      discount: formData.discount || undefined,
      discount_reason: formData.discountReason || undefined,
      payment_method: formData.paymentMethod,
    }

    updateMutation.mutate({ id: booking.id, data: updateData })
  }

  const handleDelete = () => {
    if (!booking) return
    deleteMutation.mutate(booking.id)
  }

  const handleCheckIn = () => {
    if (!booking) return

    // Client-side validation: Check if check-in time has arrived
    const now = new Date()
    const checkInTime = new Date(booking.check_in)
    if (now < checkInTime) {
      const timeDiff = checkInTime.getTime() - now.getTime()
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      const message =
        hours > 0
          ? `Check-in time has not arrived yet. Please wait ${hours} hours and ${minutes} minutes.`
          : `Check-in time has not arrived yet. Please wait ${minutes} minutes.`
      alert(message)
      return
    }

    // Client-side validation: Check room status
    if (booking.room?.status === "maintenance") {
      alert("Cannot check in: Room is under maintenance")
      return
    }

    if (booking.room?.status === "cleaning") {
      if (
        !confirm(
          "Room is being cleaned. Do you want to mark it as available and proceed with check-in?",
        )
      ) {
        return
      }
    }

    if (booking.room?.status === "occupied") {
      alert(
        "Cannot check in: Room is already occupied. This might be a data inconsistency - please contact support.",
      )
      return
    }

    // Client-side validation: Only confirmed bookings can be checked in
    if (booking.status !== "confirmed") {
      alert("Only confirmed bookings can be checked in")
      return
    }

    checkInMutation.mutate(booking.id)
  }

  const handleCheckOut = () => {
    if (!booking) return

    // Client-side validation: Only checked-in bookings can be checked out
    if (booking.status !== "checked_in") {
      alert("Only checked-in bookings can be checked out")
      return
    }

    checkOutMutation.mutate(booking.id)
  }

  if (!isOpen || !bookingId) return null

  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      confirmed: {
        color:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/25 dark:text-emerald-400",
        icon: CheckCircle,
      },
      checked_in: {
        color:
          "bg-blue-100 text-blue-700 dark:bg-blue-600/25 dark:text-blue-400",
        icon: LogIn,
      },
      checked_out: {
        color:
          "bg-violet-100 text-violet-700 dark:bg-violet-600/25 dark:text-violet-400",
        icon: LogOut,
      },
      cancelled: {
        color: "bg-red-100 text-red-700 dark:bg-red-600/25 dark:text-red-400",
        icon: XCircle,
      },
    }

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.confirmed
    const Icon = config.icon

    return (
      <div
        className={clsx(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
          config.color,
        )}
      >
        <Icon className="w-4 h-4" />
        {status?.replace("_", " ").toUpperCase()}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-2 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Booking Details
              </h2>
              {booking && (
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  ID: {booking.id.slice(0, 8)}...
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {booking && getStatusBadge(booking.status)}
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              Loading booking details...
            </p>
          </div>
        ) : booking ? (
          <div className="p-6">
            {/* Guest and Room Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Guest Info */}
              <div className="bg-neutral-50 dark:bg-dark-3 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Guest Information
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Name:
                    </span>
                    <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                      {booking.customer
                        ? `${booking.customer.first_name} ${booking.customer.last_name}`
                        : "N/A"}
                    </span>
                  </div>
                  {booking.customer?.email && (
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Email:
                      </span>
                      <span className="ml-2 text-neutral-700 dark:text-neutral-300">
                        {booking.customer.email}
                      </span>
                    </div>
                  )}
                  {booking.customer?.phone && (
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Phone:
                      </span>
                      <span className="ml-2 text-neutral-700 dark:text-neutral-300">
                        {booking.customer.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Info */}
              <div className="bg-neutral-50 dark:bg-dark-3 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Room Information
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Room:
                    </span>
                    <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                      {booking.room?.room_number} - {booking.room?.room_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Capacity:
                    </span>
                    <span className="ml-2 text-neutral-700 dark:text-neutral-300">
                      {booking.room?.capacity} guests
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Price/Night:
                    </span>
                    <span className="ml-2 text-neutral-700 dark:text-neutral-300">
                      ${booking.room?.price_per_night}
                    </span>
                  </div>
                  {/* Room Status Indicator */}
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Status:
                    </span>
                    <span className="ml-2">
                      {booking.room?.status === "available" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-600/25 dark:text-emerald-400 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Available
                        </span>
                      )}
                      {booking.room?.status === "occupied" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-600/25 dark:text-red-400 text-xs font-medium">
                          <Home className="w-3 h-3" />
                          Occupied
                        </span>
                      )}
                      {booking.room?.status === "cleaning" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-600/25 dark:text-yellow-400 text-xs font-medium">
                          <Sparkles className="w-3 h-3" />
                          Cleaning
                        </span>
                      )}
                      {booking.room?.status === "maintenance" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-600/25 dark:text-gray-400 text-xs font-medium">
                          <Wrench className="w-3 h-3" />
                          Maintenance
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-neutral-50 dark:bg-dark-3 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">
                  Stay Duration
                </h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Check-in:
                  </span>
                  <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                    {format(new Date(booking.check_in), "PPP p")}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Check-out:
                  </span>
                  <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                    {format(new Date(booking.check_out), "PPP p")}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-neutral-50 dark:bg-dark-3 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Payment Details
                  </h3>
                </div>
                {!isEditing && booking.status === "confirmed" && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Total Amount
                      </label>
                      <input
                        type="number"
                        value={formData.totalAmount}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            totalAmount: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Discount
                      </label>
                      <input
                        type="number"
                        value={formData.discount}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            discount: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Discount Reason
                    </label>
                    <input
                      type="text"
                      value={formData.discountReason}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          discountReason: e.target.value,
                        }))
                      }
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["cash", "terminal", "transfer"] as const).map(
                        (method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                paymentMethod: method,
                              }))
                            }
                            className={clsx(
                              "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                              formData.paymentMethod === method
                                ? "bg-primary-100 dark:bg-primary-600/25 border-primary-500 text-primary-600 dark:text-primary-400"
                                : "bg-white dark:bg-dark-3 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3",
                            )}
                          >
                            {method === "cash"
                              ? "Cash"
                              : method === "terminal"
                                ? "Terminal"
                                : "Transfer"}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Total Amount:
                    </span>
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      ${booking.total_amount}
                    </span>
                  </div>
                  {booking.discount && booking.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Discount:
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        -${booking.discount}
                      </span>
                    </div>
                  )}
                  {booking.discount_reason && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Reason:
                      </span>
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {booking.discount_reason}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Payment Method:
                    </span>
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {booking.payment_method}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-600">
                    <div className="flex justify-between">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        Final Amount:
                      </span>
                      <span className="font-bold text-lg text-neutral-900 dark:text-white">
                        ${booking.total_amount - (booking.discount || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {/* Status Actions - Only show if user has permission */}
              {booking.status === "confirmed" && canCheckInOut() && (
                <button
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {checkInMutation.isPending ? "Processing..." : "Check In"}
                </button>
              )}

              {booking.status === "checked_in" && canCheckInOut() && (
                <button
                  onClick={handleCheckOut}
                  disabled={checkOutMutation.isPending}
                  className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {checkOutMutation.isPending ? "Processing..." : "Check Out"}
                </button>
              )}

              {/* Delete Action - Only show if user has permission */}
              {booking.status !== "checked_out" &&
                canDeleteBookings() &&
                (!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 border border-red-300 dark:border-red-600/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
                    >
                      {deleteMutation.isPending
                        ? "Deleting..."
                        : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              Booking not found
            </p>
          </div>
        )}
      </div>
    </div>
  )
})
