import {
  actualCheckInBooking,
  actualCheckOutBooking,
  changeBookingRoom,
  checkInBooking,
  checkOutBooking,
  deleteBooking,
  getBooking,
  modifyBookingDates,
  updateBooking,
} from "@/api/bookings"
import { getRooms, updateRoomStatus } from "@/api/rooms"
import type {
  BookingPublic,
  BookingUpdate,
  DateModificationRequest,
  RoomChangeRequest,
} from "@/client/types.gen"
import { useConfirm } from "@/hooks/useConfirm"
import { useRole } from "@/hooks/useRole"
import { showError, showSuccess } from "@/utils/error-handling"
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
  bookingId: string | undefined
}

export const BookingDetailModal = memo(function BookingDetailModal({
  isOpen,
  onClose,
  bookingId,
}: BookingDetailModalProps) {
  const queryClient = useQueryClient()
  const {
    canDeleteBookings,
    canUpdateDiscount,
    canCheckInOut,
    canPerformActualOperations,
    canModifyPlannedDates,
    canChangeRoom,
    canViewPaymentAdjustments,
  } = useRole()
  const { confirm, ConfirmDialog } = useConfirm()
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDiscountFields, setShowDiscountFields] = useState(false)
  const [showDateModification, setShowDateModification] = useState(false)
  const [showRoomChange, setShowRoomChange] = useState(false)
  const [dateModification, setDateModification] = useState<DateModificationRequest>({})
  const [selectedNewRoom, setSelectedNewRoom] = useState<string>("")

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

  // Fetch available rooms for room change
  const { data: availableRooms } = useQuery({
    queryKey: ["rooms", "available"],
    queryFn: () => getRooms({ limit: 100 }),
    enabled: showRoomChange,
  })

  // Set form data when booking loads
  useEffect(() => {
    if (booking) {
      const hasDiscount = booking.discount && booking.discount > 0
      setFormData({
        totalAmount: booking.total_amount,
        discount: booking.discount || 0,
        discountReason: booking.discount_reason || "",
        paymentMethod: booking.payment_method || "cash",
      })
      setShowDiscountFields(hasDiscount)
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
      showSuccess("Booking updated successfully!")
      setIsEditing(false)
    },
    onError: (error) => {
      showError(error, "Failed to update booking. Please try again.")
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
      showSuccess("Booking deleted successfully!")
      onClose()
    },
    onError: (error) => {
      showError(error, "Failed to delete booking. Please try again.")
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
      showSuccess("Guest checked in successfully!")
    },
    onError: (error) => {
      showError(error, "Failed to check in booking. Please try again.")
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
      showSuccess("Guest checked out successfully!")
    },
    onError: (error) => {
      showError(error, "Failed to check out booking. Please try again.")
    },
  })

  // Actual check-in mutation
  const actualCheckInMutation = useMutation({
    mutationFn: (id: string) => actualCheckInBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
      showSuccess("Actual check-in time recorded!")
    },
    onError: (error) => {
      showError(error, "Failed to record actual check-in")
    },
  })

  // Actual check-out mutation
  const actualCheckOutMutation = useMutation({
    mutationFn: (id: string) => actualCheckOutBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
      showSuccess("Actual check-out time recorded!")
    },
    onError: (error) => {
      showError(error, "Failed to record actual check-out")
    },
  })

  // Modify dates mutation
  const modifyDatesMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DateModificationRequest }) =>
      modifyBookingDates(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
      const diff = response.payment_difference
      if (diff > 0) {
        showSuccess(`Dates modified. Additional charge: $${diff.toFixed(2)}`)
      } else if (diff < 0) {
        showSuccess(`Dates modified. Refund amount: $${Math.abs(diff).toFixed(2)}`)
      } else {
        showSuccess("Dates modified successfully!")
      }
      setShowDateModification(false)
      setDateModification({})
    },
    onError: (error) => {
      showError(error, "Failed to modify dates")
    },
  })

  // Helper to handle date modification with confirmation
  const handleDateModification = async () => {
    if (!booking || !booking.room) return

    const newCheckIn = dateModification.new_check_in
      ? new Date(dateModification.new_check_in)
      : new Date(booking.check_in)
    const newCheckOut = dateModification.new_check_out
      ? new Date(dateModification.new_check_out)
      : new Date(booking.check_out)

    const oldNights = Math.ceil(
      (new Date(booking.check_out).getTime() -
        new Date(booking.check_in).getTime()) /
        (1000 * 60 * 60 * 24),
    )
    const newNights = Math.ceil(
      (newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24),
    )

    const nightsDiff = newNights - oldNights
    const priceDiff = nightsDiff * booking.room.price_per_night

    // Build confirmation message
    let message = `Change booking dates?\n\n`
    message += `Old: ${format(new Date(booking.check_in), "PPP")} - ${format(
      new Date(booking.check_out),
      "PPP",
    )} (${oldNights} nights)\n`
    message += `New: ${format(newCheckIn, "PPP")} - ${format(
      newCheckOut,
      "PPP",
    )} (${newNights} nights)\n\n`

    if (priceDiff > 0) {
      message += `⚠️ Additional charge: $${priceDiff.toFixed(2)}\n`
      message += `(${nightsDiff} additional nights × $${booking.room.price_per_night}/night)`
    } else if (priceDiff < 0) {
      message += `✅ Refund amount: $${Math.abs(priceDiff).toFixed(2)}\n`
      message += `(${Math.abs(nightsDiff)} fewer nights × $${booking.room.price_per_night}/night)`
    } else {
      message += "No price difference"
    }

    const confirmed = await confirm({
      title: "Confirm Date Modification",
      message,
      confirmText: "Modify Dates",
      variant: priceDiff > 0 ? "warning" : priceDiff < 0 ? "success" : "primary",
    })

    if (confirmed) {
      modifyDatesMutation.mutate({
        id: booking.id,
        data: dateModification,
      })
    }
  }

  // Change room mutation
  const changeRoomMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoomChangeRequest }) =>
      changeBookingRoom(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      const diff = response.payment_difference
      if (diff > 0) {
        showSuccess(`Room changed. Additional charge: $${diff.toFixed(2)}`)
      } else if (diff < 0) {
        showSuccess(`Room changed. Refund amount: $${Math.abs(diff).toFixed(2)}`)
      } else {
        showSuccess("Room changed successfully!")
      }
      setShowRoomChange(false)
      setSelectedNewRoom("")
    },
    onError: (error) => {
      showError(error, "Failed to change room")
    },
  })

  const handleSave = () => {
    if (!booking) return

    // Validate discount reason
    if (formData.discount > 0 && !formData.discountReason.trim()) {
      showError("Discount reason is required when discount is applied")
      return
    }

    // Don't allow changing total amount directly - keep original base amount
    // and apply discount to calculate final amount
    const finalAmount = formData.totalAmount * (1 - formData.discount / 100)

    const updateData: BookingUpdate = {
      total_amount: finalAmount,
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

  const handleCheckIn = async () => {
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
      showError(message)
      return
    }

    // Client-side validation: Check room status
    if (booking.room?.status === "maintenance") {
      showError("Cannot check in: Room is under maintenance")
      return
    }

    // Handle cleaning status with confirmation and two API calls
    if (booking.room?.status === "cleaning") {
      const confirmed = await confirm({
        title: "Room Status Confirmation",
        message:
          "Room is being cleaned. Do you want to mark it as available and proceed with check-in?",
        confirmText: "Yes, Proceed",
        variant: "warning",
      })

      if (!confirmed) {
        return
      }

      // First update room status to AVAILABLE
      try {
        await updateRoomStatus(booking.room_id, "available")
        // Invalidate room queries to update UI
        queryClient.invalidateQueries({ queryKey: ["rooms"] })
        queryClient.invalidateQueries({ queryKey: ["room", booking.room_id] })
      } catch (error) {
        showError("Failed to update room status. Please try again.")
        return
      }
    }

    if (booking.room?.status === "occupied") {
      showError(
        "Cannot check in: Room is already occupied. This might be a data inconsistency - please contact support.",
      )
      return
    }

    // Client-side validation: Only confirmed bookings can be checked in
    if (booking.status !== "confirmed") {
      showError("Only confirmed bookings can be checked in")
      return
    }

    checkInMutation.mutate(booking.id)
  }

  const handleCheckOut = () => {
    if (!booking) return

    // Client-side validation: Only checked-in bookings can be checked out
    if (booking.status !== "checked_in") {
      showError("Only checked-in bookings can be checked out")
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    <h3 className="font-medium text-neutral-900 dark:text-white">
                      Room Information
                    </h3>
                  </div>
                  {canChangeRoom(booking.status) &&
                    ["confirmed", "checked_in"].includes(booking.status || "") && (
                      <button
                        onClick={() => setShowRoomChange(true)}
                        className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Change Room
                      </button>
                    )}
                </div>
                {showRoomChange ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Select New Room
                      </label>
                      <select
                        value={selectedNewRoom}
                        onChange={(e) => setSelectedNewRoom(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Choose a room...</option>
                        {availableRooms?.data
                          ?.filter(
                            (room) =>
                              room.status === "available" &&
                              room.id !== booking.room_id,
                          )
                          .map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.room_number} - {room.room_type} ($
                              {room.price_per_night}/night)
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (booking && selectedNewRoom) {
                            changeRoomMutation.mutate({
                              id: booking.id,
                              data: { new_room_id: selectedNewRoom },
                            })
                          }
                        }}
                        disabled={
                          changeRoomMutation.isPending || !selectedNewRoom
                        }
                        className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium disabled:cursor-not-allowed"
                      >
                        {changeRoomMutation.isPending
                          ? "Changing..."
                          : "Change Room"}
                      </button>
                      <button
                        onClick={() => {
                          setShowRoomChange(false)
                          setSelectedNewRoom("")
                        }}
                        className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-neutral-50 dark:bg-dark-3 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Stay Duration
                  </h3>
                </div>
                {canModifyPlannedDates() && booking.status === "confirmed" && (
                  <button
                    onClick={() => {
                      setShowDateModification(true)
                      setDateModification({
                        new_check_in: booking.check_in,
                        new_check_out: booking.check_out,
                      })
                    }}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Modify Dates
                  </button>
                )}
              </div>

              {showDateModification ? (
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        New Check-in
                      </label>
                      <input
                        type="datetime-local"
                        value={
                          dateModification.new_check_in
                            ? new Date(dateModification.new_check_in)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          setDateModification({
                            ...dateModification,
                            new_check_in: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          })
                        }
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        New Check-out
                      </label>
                      <input
                        type="datetime-local"
                        value={
                          dateModification.new_check_out
                            ? new Date(dateModification.new_check_out)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          setDateModification({
                            ...dateModification,
                            new_check_out: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          })
                        }
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDateModification}
                      disabled={modifyDatesMutation.isPending}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors text-sm font-medium disabled:cursor-not-allowed"
                    >
                      {modifyDatesMutation.isPending ? "Saving..." : "Preview Changes"}
                    </button>
                    <button
                      onClick={() => {
                        setShowDateModification(false)
                        setDateModification({})
                      }}
                      className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Planned Check-in:
                      </span>
                      <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                        {format(new Date(booking.check_in), "PPP p")}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Planned Check-out:
                      </span>
                      <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                        {format(new Date(booking.check_out), "PPP p")}
                      </span>
                    </div>
                  </div>

                  {/* Actual times */}
                  {(booking.actual_check_in || booking.actual_check_out) && (
                    <div className="pt-3 border-t border-neutral-200 dark:border-neutral-600">
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        {booking.actual_check_in && (
                          <div>
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Actual Check-in:
                            </span>
                            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                              {format(new Date(booking.actual_check_in), "PPP p")}
                            </span>
                          </div>
                        )}
                        {booking.actual_check_out && (
                          <div>
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Actual Check-out:
                            </span>
                            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                              {format(new Date(booking.actual_check_out), "PPP p")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actual operation buttons */}
                  {canPerformActualOperations() && (
                    <div className="flex gap-2 pt-2">
                      {booking.status === "checked_in" && !booking.actual_check_in && (
                        <button
                          onClick={() => actualCheckInMutation.mutate(booking.id)}
                          disabled={actualCheckInMutation.isPending}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors text-xs font-medium disabled:cursor-not-allowed"
                        >
                          {actualCheckInMutation.isPending
                            ? "Recording..."
                            : "Record Actual Check-in"}
                        </button>
                      )}
                      {booking.status === "checked_in" && !booking.actual_check_out && (
                        <button
                          onClick={() => actualCheckOutMutation.mutate(booking.id)}
                          disabled={actualCheckOutMutation.isPending}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors text-xs font-medium disabled:cursor-not-allowed"
                        >
                          {actualCheckOutMutation.isPending
                            ? "Recording..."
                            : "Record Actual Check-out"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                  {/* Discount */}
                  {!showDiscountFields ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDiscountFields(true)
                          setFormData((prev) => ({
                            ...prev,
                            discount: 10,
                            discountReason: "",
                          }))
                        }}
                        className="w-full px-4 py-2 border border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Apply Discount
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Discount (%)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                value={formData.discount}
                                onChange={(e) => {
                                  let value = e.target.value
                                  // Remove leading zeros but keep at least one digit
                                  value = value.replace(/^0+(?=\d)/, "") || "0"
                                  const numValue = Number(value)
                                  if (numValue >= 0 && numValue <= 100) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      discount: numValue,
                                    }))
                                  }
                                }}
                                min="0"
                                max="100"
                                className="w-full pl-3 pr-8 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                style={{
                                  appearance: "textfield",
                                  MozAppearance: "textfield",
                                }}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                                %
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowDiscountFields(false)
                                setFormData((prev) => ({
                                  ...prev,
                                  discount: 0,
                                  discountReason: "",
                                }))
                              }}
                              className="px-2 py-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                              title="Remove discount"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                            Reason
                            {formData.discount > 0 && (
                              <span className="text-danger-600 dark:text-danger-400">
                                {" *"}
                              </span>
                            )}
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
                            placeholder={
                              formData.discount > 0 ? "Required" : ""
                            }
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            required={formData.discount > 0}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Price Calculation
                    </label>
                    <div className="space-y-2 p-3 bg-neutral-100 dark:bg-dark-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Room Rate:
                        </span>
                        <span className="text-sm font-medium">
                          ${booking.room?.price_per_night}/night
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Nights:
                        </span>
                        <span className="text-sm font-medium">
                          {Math.ceil(
                            (new Date(booking.check_out).getTime() -
                              new Date(booking.check_in).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-neutral-200 dark:border-neutral-600 flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Base Amount:
                        </span>
                        <span className="text-sm font-medium">
                          ${formData.totalAmount}
                        </span>
                      </div>
                      {formData.discount > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              Discount ({formData.discount}%):
                            </span>
                            <span className="text-sm text-red-600 dark:text-red-400">
                              -${
                                ((formData.totalAmount * formData.discount) / 100).toFixed(
                                  2
                                )
                              }
                            </span>
                          </div>
                          <div className="pt-1 border-t border-neutral-200 dark:border-neutral-600 flex justify-between items-center">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                              Final Amount:
                            </span>
                            <span className="font-bold text-lg text-neutral-900 dark:text-white">
                              ${
                                (
                                  formData.totalAmount *
                                  (1 - formData.discount / 100)
                                ).toFixed(2)
                              }
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
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
                        -{booking.discount}%
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
                        ${booking.total_amount}
                      </span>
                    </div>
                  </div>
                  {/* Payment adjustments */}
                  {canViewPaymentAdjustments() &&
                    (booking.refund_amount > 0 ||
                      booking.additional_payment > 0) && (
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-600 space-y-1">
                        {booking.refund_amount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Refund Applied:
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              -${booking.refund_amount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {booking.additional_payment > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Additional Payment:
                            </span>
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                              +${booking.additional_payment.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
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
      {ConfirmDialog}
    </div>
  )
})
