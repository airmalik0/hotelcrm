import {
  changeBookingRoom,
  checkInBooking,
  checkOutBooking,
  deleteBooking,
  getBooking,
  getBookings,
  modifyBookingDates,
  modifyBookingDiscount,
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
import { isRoomAvailable } from "@/utils/booking-grid"
import { getPaymentAdjustmentSummary } from "@/utils/booking-payments"
import { safeParseDate } from "@/utils/date-helpers"
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
  const [dateModification, setDateModification] =
    useState<DateModificationRequest>({})
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

  // Fetch rooms for room change
  const { data: availableRooms } = useQuery({
    queryKey: ["rooms", "all"],
    queryFn: () => getRooms({ limit: 100 }),
    enabled: showRoomChange,
  })

  // Fetch all bookings to check for availability conflicts
  const { data: allBookings } = useQuery({
    queryKey: ["bookings", "forAvailability"],
    queryFn: () => getBookings({ limit: 1000 }),
    enabled: showRoomChange && !!booking,
  })

  // Set form data when booking loads
  useEffect(() => {
    if (booking?.room) {
      const hasDiscount = booking.discount && booking.discount > 0
      // Calculate base amount (before discount) - same as backend
      const checkIn = safeParseDate(booking.check_in)
      const checkOut = safeParseDate(booking.check_out)
      const startDate = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate())
      const endDate = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate())
      const diffTime = endDate.getTime() - startDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const nights = Math.max(1, diffDays)
      const baseAmount = booking.room.price_per_night * nights

      setFormData({
        totalAmount: baseAmount, // Use base amount, not discounted amount
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

  // Modify dates mutation
  const modifyDatesMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DateModificationRequest }) =>
      modifyBookingDates(id, data),
    onSuccess: (response) => {
      // Use the helper to properly invalidate all relevant queries including the booking grid
      invalidateAfterBookingUpdate(queryClient, bookingId!)
      const diff = response.payment_difference
      if (diff > 0) {
        showSuccess(`Dates modified. Additional charge: $${diff.toFixed(2)}`)
      } else if (diff < 0) {
        showSuccess(
          `Dates modified. Refund amount: $${Math.abs(diff).toFixed(2)}`,
        )
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
      ? safeParseDate(dateModification.new_check_in)
      : safeParseDate(booking.check_in)
    const newCheckOut = dateModification.new_check_out
      ? safeParseDate(dateModification.new_check_out)
      : safeParseDate(booking.check_out)

    // Calculate nights the same way as backend: difference in days only
    const oldCheckIn = safeParseDate(booking.check_in)
    const oldCheckOut = safeParseDate(booking.check_out)
    const oldStartDate = new Date(oldCheckIn.getFullYear(), oldCheckIn.getMonth(), oldCheckIn.getDate())
    const oldEndDate = new Date(oldCheckOut.getFullYear(), oldCheckOut.getMonth(), oldCheckOut.getDate())
    const oldDiffTime = oldEndDate.getTime() - oldStartDate.getTime()
    const oldDiffDays = Math.floor(oldDiffTime / (1000 * 60 * 60 * 24))
    const oldNights = Math.max(1, oldDiffDays)

    const newStartDate = new Date(newCheckIn.getFullYear(), newCheckIn.getMonth(), newCheckIn.getDate())
    const newEndDate = new Date(newCheckOut.getFullYear(), newCheckOut.getMonth(), newCheckOut.getDate())
    const newDiffTime = newEndDate.getTime() - newStartDate.getTime()
    const newDiffDays = Math.floor(newDiffTime / (1000 * 60 * 60 * 24))
    const newNights = Math.max(1, newDiffDays)

    const nightsDiff = newNights - oldNights
    const priceDiff = nightsDiff * booking.room.price_per_night

    // Build confirmation message
    // Calculate actual amounts with discount
    const hasDiscount = booking.discount && booking.discount > 0
    const discountMultiplier = hasDiscount ? 1 - booking.discount / 100 : 1
    const actualDiff = priceDiff * discountMultiplier

    const message = (
      <div className="space-y-3">
        <div className="text-sm space-y-2">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">
              Current dates:
            </span>
            <div className="font-medium">
              {format(safeParseDate(booking.check_in), "PPP")} -{" "}
              {format(safeParseDate(booking.check_out), "PPP")}
              <span className="text-neutral-600 dark:text-neutral-400 text-xs ml-2">
                ({oldNights} nights)
              </span>
            </div>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">
              New dates:
            </span>
            <div className="font-medium">
              {format(newCheckIn, "PPP")} - {format(newCheckOut, "PPP")}
              <span className="text-neutral-600 dark:text-neutral-400 text-xs ml-2">
                ({newNights} nights)
              </span>
            </div>
          </div>
        </div>
        {actualDiff > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 text-sm border border-orange-200 dark:border-orange-600/50">
            <div className="font-medium text-orange-800 dark:text-orange-300">
              Additional charge: ${actualDiff.toFixed(2)}
            </div>
            <div className="text-orange-700 dark:text-orange-400 text-xs mt-1">
              ({nightsDiff} additional nights × ${booking.room.price_per_night}
              /night{hasDiscount && ` with ${booking.discount}% discount`})
            </div>
          </div>
        )}
        {actualDiff < 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3 text-sm border border-emerald-200 dark:border-emerald-600/50">
            <div className="font-medium text-emerald-800 dark:text-emerald-300">
              Refund amount: ${Math.abs(actualDiff).toFixed(2)}
            </div>
            <div className="text-emerald-700 dark:text-emerald-400 text-xs mt-1">
              ({Math.abs(nightsDiff)} fewer nights × $
              {booking.room.price_per_night}/night
              {hasDiscount && ` with ${booking.discount}% discount`})
            </div>
          </div>
        )}
        {actualDiff === 0 && (
          <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-3 text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
            No price difference
          </div>
        )}
      </div>
    )

    const confirmed = await confirm({
      title: "Confirm Date Modification",
      message,
      confirmText: "Modify Dates",
      variant:
        actualDiff > 0 ? "warning" : actualDiff < 0 ? "success" : "primary",
    })

    if (confirmed) {
      // For checked-in bookings, only send new_check_out
      const modificationData =
        booking.status === "checked_in"
          ? { new_check_out: dateModification.new_check_out }
          : dateModification

      modifyDatesMutation.mutate({
        id: booking.id,
        data: modificationData,
      })
    }
  }

  // Modify discount mutation
  const modifyDiscountMutation = useMutation({
    mutationFn: ({
      id,
      discount,
      discountReason,
    }: { id: string; discount: number; discountReason?: string }) =>
      modifyBookingDiscount(id, {
        new_discount: discount,
        discount_reason: discountReason,
      }),
    onSuccess: (response) => {
      invalidateAfterBookingUpdate(queryClient, bookingId!)
      const diff = response.payment_difference
      if (diff > 0) {
        showSuccess(`Discount modified. Additional charge: $${diff.toFixed(2)}`)
      } else if (diff < 0) {
        showSuccess(
          `Discount modified. Refund amount: $${Math.abs(diff).toFixed(2)}`,
        )
      } else {
        showSuccess("Discount modified successfully!")
      }
      setIsEditing(false)
    },
    onError: (error) => {
      showError(error, "Failed to modify discount")
    },
  })

  // Change room mutation
  const changeRoomMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoomChangeRequest }) =>
      changeBookingRoom(id, data),
    onSuccess: (response) => {
      // Use the helper to properly invalidate all relevant queries including the booking grid
      // Room change affects the booking grid position
      invalidateAfterBookingUpdate(queryClient, bookingId!, {
        roomChanged: true,
        oldRoomId: booking?.room_id,
        newRoomId: selectedNewRoom,
      })
      const diff = response.payment_difference
      if (diff > 0) {
        showSuccess(`Room changed. Additional charge: $${diff.toFixed(2)}`)
      } else if (diff < 0) {
        showSuccess(
          `Room changed. Refund amount: $${Math.abs(diff).toFixed(2)}`,
        )
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

  // Helper to handle room change with confirmation
  const handleRoomChange = async () => {
    if (!booking || !selectedNewRoom) return

    // Find the new room details
    const newRoom = availableRooms?.data?.find((r) => r.id === selectedNewRoom)
    if (!newRoom) return

    // Calculate nights the same way as backend: difference in days only
    const checkIn = safeParseDate(booking.check_in)
    const checkOut = safeParseDate(booking.check_out)
    const startDate = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate())
    const endDate = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate())
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const nights = Math.max(1, diffDays)

    const priceDiff =
      (newRoom.price_per_night - (booking.room?.price_per_night || 0)) * nights

    // Calculate actual amounts with discount
    const hasDiscount = booking.discount && booking.discount > 0
    const discountMultiplier = hasDiscount ? 1 - booking.discount / 100 : 1
    const actualDiff = priceDiff * discountMultiplier

    // Build confirmation message
    const message = (
      <div className="space-y-3">
        <div className="text-sm">
          <div>
            Move booking from{" "}
            <span className="font-medium">
              Room {booking.room?.room_number}
            </span>{" "}
            to <span className="font-medium">Room {newRoom.room_number}</span>?
          </div>
        </div>
        {actualDiff > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 text-sm border border-orange-200 dark:border-orange-600/50">
            <div className="font-medium text-orange-800 dark:text-orange-300">
              Additional charge: ${actualDiff.toFixed(2)}
            </div>
            <div className="text-orange-700 dark:text-orange-400 text-xs mt-1">
              ({nights} nights × $
              {Math.abs(
                newRoom.price_per_night - (booking.room?.price_per_night || 0),
              ).toFixed(2)}
              /night{hasDiscount && ` with ${booking.discount}% discount`})
            </div>
          </div>
        )}
        {actualDiff < 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3 text-sm border border-emerald-200 dark:border-emerald-600/50">
            <div className="font-medium text-emerald-800 dark:text-emerald-300">
              Refund amount: ${Math.abs(actualDiff).toFixed(2)}
            </div>
            <div className="text-emerald-700 dark:text-emerald-400 text-xs mt-1">
              ({nights} nights × $
              {Math.abs(
                newRoom.price_per_night - (booking.room?.price_per_night || 0),
              ).toFixed(2)}
              /night{hasDiscount && ` with ${booking.discount}% discount`})
            </div>
          </div>
        )}
        {actualDiff === 0 && (
          <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-3 text-sm text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
            Same price - no payment adjustment needed
          </div>
        )}
      </div>
    )

    const confirmed = await confirm({
      title: "Confirm Room Change",
      message,
      confirmText: "Change Room",
      variant:
        actualDiff > 0 ? "warning" : actualDiff < 0 ? "success" : "primary",
    })

    if (confirmed) {
      changeRoomMutation.mutate({
        id: booking.id,
        data: { new_room_id: selectedNewRoom },
      })
    }
  }

  const handleSave = () => {
    if (!booking) return

    // Validate discount reason
    if (formData.discount > 0 && !formData.discountReason.trim()) {
      showError("Discount reason is required when discount is applied")
      return
    }

    // Check if discount has changed
    const discountChanged = formData.discount !== (booking.discount || 0)

    if (
      discountChanged &&
      canUpdateDiscount &&
      (booking.status === "checked_in" || booking.status === "confirmed")
    ) {
      // Use special discount modification API for proper payment adjustments
      modifyDiscountMutation.mutate({
        id: booking.id,
        discount: formData.discount,
        discountReason: formData.discountReason || undefined,
      })
    } else {
      // For other changes or non-discount updates, use regular update
      const updateData: BookingUpdate = {
        payment_method: formData.paymentMethod,
      }
      updateMutation.mutate({ id: booking.id, data: updateData })
    }
  }

  const handleDelete = () => {
    if (!booking) return
    deleteMutation.mutate(booking.id)
  }

  const handleCheckIn = async () => {
    if (!booking) return

    // Client-side validation: Check room status
    if (booking.room?.status === "maintenance") {
      showError("Cannot check in: Room is under maintenance")
      return
    }

    // Check if checking in earlier than planned
    const now = new Date()
    const plannedCheckIn = safeParseDate(booking.check_in)
    const isEarlyCheckIn = now < plannedCheckIn

    // If early check-in, show warning
    if (isEarlyCheckIn) {
      const timeDiff = plannedCheckIn.getTime() - now.getTime()
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

      const earlyMessage = (
        <div className="space-y-2">
          <div className="text-sm">
            You are attempting to check in{" "}
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              {hours > 0
                ? `${hours} hours and ${minutes} minutes`
                : `${minutes} minutes`}
            </span>{" "}
            earlier than the planned check-in time.
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Planned check-in:{" "}
            <span className="font-medium">
              {format(plannedCheckIn, "PPP 'at' HH:mm")}
            </span>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Current time:{" "}
            <span className="font-medium">{format(now, "PPP 'at' HH:mm")}</span>
          </div>
        </div>
      )

      const confirmedEarly = await confirm({
        title: "Early Check-in Confirmation",
        message: earlyMessage,
        confirmText: "Proceed with Early Check-in",
        variant: "warning",
      })

      if (!confirmedEarly) {
        return
      }
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
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-400",
        icon: CheckCircle,
      },
      checked_in: {
        color:
          "bg-blue-100 text-blue-700 dark:bg-blue-600/30 dark:text-blue-400",
        icon: LogIn,
      },
      checked_out: {
        color:
          "bg-violet-100 text-violet-700 dark:bg-violet-600/30 dark:text-violet-400",
        icon: LogOut,
      },
      cancelled: {
        color:
          "bg-danger-100 text-danger-700 dark:bg-danger-600/30 dark:text-danger-400",
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
              <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
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
              <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    <h3 className="font-medium text-neutral-900 dark:text-white">
                      Room Information
                    </h3>
                  </div>
                  {canChangeRoom(booking.status) &&
                    ["confirmed", "checked_in"].includes(
                      booking.status || "",
                    ) && (
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
                        className="w-full ps-3 pe-5 py-1.5 text-sm border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!availableRooms || !allBookings}
                      >
                        <option value="">
                          {!availableRooms || !allBookings
                            ? "Loading rooms..."
                            : "Choose a room..."}
                        </option>
                        {availableRooms?.data &&
                          allBookings?.data &&
                          (() => {
                            const filteredRooms = availableRooms.data.filter(
                              (room) =>
                                // Exclude current room
                                room.id !== booking.room_id &&
                                // Exclude maintenance rooms
                                room.status !== "maintenance" &&
                                // Check for booking conflicts in the date range
                                // (not room status, as room might be occupied now but available for guest's dates)
                                isRoomAvailable(
                                  room.id,
                                  safeParseDate(booking.check_in),
                                  safeParseDate(booking.check_out),
                                  allBookings.data || [],
                                  booking.id, // Exclude current booking from conflict check
                                ),
                            )

                            if (filteredRooms.length === 0) {
                              return (
                                <option value="" disabled>
                                  No rooms available for these dates
                                </option>
                              )
                            }

                            return filteredRooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.room_number} - {room.room_type} ($
                                {room.price_per_night}/night)
                                {room.status !== "available" &&
                                  ` [${room.status}]`}
                              </option>
                            ))
                          })()}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      {(() => {
                        // Calculate price difference for button styling
                        if (!selectedNewRoom) {
                          return (
                            <button
                              disabled
                              className="px-4 py-2.5 bg-neutral-400 text-white font-medium rounded-lg text-sm cursor-not-allowed opacity-50"
                            >
                              Select a Room
                            </button>
                          )
                        }

                        const newRoom = availableRooms?.data?.find(
                          (r) => r.id === selectedNewRoom,
                        )
                        if (!newRoom) return null

                        // Calculate nights the same way as backend: difference in days only
                        const checkIn = safeParseDate(booking.check_in)
                        const checkOut = safeParseDate(booking.check_out)
                        const startDate = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate())
                        const endDate = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate())
                        const diffTime = endDate.getTime() - startDate.getTime()
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                        const nights = Math.max(1, diffDays)
                        const priceDiff =
                          (newRoom.price_per_night -
                            (booking.room?.price_per_night || 0)) *
                          nights
                        const discountMultiplier = booking.discount
                          ? 1 - booking.discount / 100
                          : 1
                        const actualDiff = priceDiff * discountMultiplier

                        return (
                          <button
                            onClick={handleRoomChange}
                            disabled={changeRoomMutation.isPending}
                            className={`px-4 py-2.5 font-medium rounded-lg transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-50 text-white ${
                              actualDiff > 0
                                ? "bg-orange-600 hover:bg-orange-700"
                                : actualDiff < 0
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-primary-600 hover:bg-primary-700"
                            } disabled:bg-neutral-300 dark:disabled:bg-neutral-700 disabled:text-neutral-500 dark:disabled:text-neutral-400`}
                          >
                            {changeRoomMutation.isPending
                              ? "Changing..."
                              : actualDiff > 0
                                ? "Add Charge & Change"
                                : actualDiff < 0
                                  ? "Apply Refund & Change"
                                  : "Change Room"}
                          </button>
                        )
                      })()}
                      <button
                        onClick={() => {
                          setShowRoomChange(false)
                          setSelectedNewRoom("")
                        }}
                        className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
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
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-400 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Available
                          </span>
                        )}
                        {booking.room?.status === "occupied" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-danger-100 text-danger-700 dark:bg-danger-600/30 dark:text-danger-400 text-xs font-medium">
                            <Home className="w-3 h-3" />
                            Occupied
                          </span>
                        )}
                        {booking.room?.status === "cleaning" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-600/30 dark:text-yellow-400 text-xs font-medium">
                            <Sparkles className="w-3 h-3" />
                            Cleaning
                          </span>
                        )}
                        {booking.room?.status === "maintenance" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-600/30 dark:text-neutral-400 text-xs font-medium">
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
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Stay Duration
                  </h3>
                </div>
                {((canModifyPlannedDates() && booking.status === "confirmed") ||
                  (canPerformActualOperations && booking.status === "checked_in")) && (
                  <button
                    onClick={() => {
                      setShowDateModification(true)
                      // Initialize with current dates for easier modification
                      const checkIn = safeParseDate(booking.check_in)
                      const checkOut = safeParseDate(booking.check_out)
                      // For checked-in bookings, hosts can only modify check-out date
                      if (booking.status === "checked_in") {
                        setDateModification({
                          new_check_in: checkIn.toISOString(),
                          new_check_out: checkOut.toISOString(),
                        })
                      } else {
                        setDateModification({
                          new_check_in: checkIn.toISOString(),
                          new_check_out: checkOut.toISOString(),
                        })
                      }
                    }}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    {booking.status === "checked_in" ? "Modify Check-out" : "Modify Dates"}
                  </button>
                )}
              </div>

              {showDateModification ? (
                <div className="space-y-3">
                  {/* Show current dates for reference */}
                  <div className="p-3 bg-white dark:bg-dark-2 rounded-lg text-sm border border-neutral-200 dark:border-neutral-600">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        Current dates:
                      </span>
                    </div>
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {format(safeParseDate(booking.check_in), "PPP")} →{" "}
                      {format(safeParseDate(booking.check_out), "PPP")}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        New Check-in Date
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={
                            dateModification.new_check_in
                              ? safeParseDate(dateModification.new_check_in)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => {
                            if (e.target.value) {
                              // Preserve the time from the original check-in
                              const originalDate = safeParseDate(
                                dateModification.new_check_in ||
                                  booking.check_in,
                              )
                              const newDate = safeParseDate(e.target.value)
                              newDate.setHours(originalDate.getHours())
                              newDate.setMinutes(originalDate.getMinutes())
                              setDateModification({
                                ...dateModification,
                                new_check_in: newDate.toISOString(),
                              })
                            }
                          }}
                          disabled={booking.status === "checked_in"}
                          className="px-3 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <input
                          type="time"
                          value={
                            dateModification.new_check_in
                              ? safeParseDate(dateModification.new_check_in)
                                  .toTimeString()
                                  .slice(0, 5)
                              : safeParseDate(booking.check_in)
                                  .toTimeString()
                                  .slice(0, 5)
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(":")
                              const date = safeParseDate(
                                dateModification.new_check_in ||
                                  booking.check_in,
                              )
                              date.setHours(
                                Number.parseInt(hours),
                                Number.parseInt(minutes),
                                0,
                                0,
                              )
                              setDateModification({
                                ...dateModification,
                                new_check_in: date.toISOString(),
                              })
                            }
                          }}
                          disabled={booking.status === "checked_in"}
                          className="px-3 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        New Check-out Date
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={
                            dateModification.new_check_out
                              ? safeParseDate(dateModification.new_check_out)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          min={
                            dateModification.new_check_in
                              ? new Date(
                                  safeParseDate(
                                    dateModification.new_check_in,
                                  ).getTime() + 86400000,
                                )
                                  .toISOString()
                                  .split("T")[0]
                              : new Date(new Date().getTime() + 86400000)
                                  .toISOString()
                                  .split("T")[0]
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              // Preserve the time from the original check-out
                              const originalDate = safeParseDate(
                                dateModification.new_check_out ||
                                  booking.check_out,
                              )
                              const newDate = safeParseDate(e.target.value)
                              newDate.setHours(originalDate.getHours())
                              newDate.setMinutes(originalDate.getMinutes())
                              setDateModification({
                                ...dateModification,
                                new_check_out: newDate.toISOString(),
                              })
                            }
                          }}
                          className="px-3 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <input
                          type="time"
                          value={
                            dateModification.new_check_out
                              ? safeParseDate(dateModification.new_check_out)
                                  .toTimeString()
                                  .slice(0, 5)
                              : safeParseDate(booking.check_out)
                                  .toTimeString()
                                  .slice(0, 5)
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(":")
                              const date = safeParseDate(
                                dateModification.new_check_out ||
                                  booking.check_out,
                              )
                              date.setHours(
                                Number.parseInt(hours),
                                Number.parseInt(minutes),
                                0,
                                0,
                              )
                              setDateModification({
                                ...dateModification,
                                new_check_out: date.toISOString(),
                              })
                            }
                          }}
                          className="px-3 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview and action buttons */}
                  {(() => {
                    if (
                      !dateModification.new_check_in ||
                      !dateModification.new_check_out
                    ) {
                      return (
                        <div className="flex gap-2">
                          <button
                            onClick={handleDateModification}
                            disabled={
                              modifyDatesMutation.isPending ||
                              !dateModification.new_check_in ||
                              !dateModification.new_check_out
                            }
                            className="px-4 py-2.5 bg-neutral-400 text-white font-medium rounded-lg transition-colors text-sm cursor-not-allowed opacity-50"
                          >
                            Select Dates
                          </button>
                          <button
                            onClick={() => {
                              setShowDateModification(false)
                              setDateModification({})
                            }}
                            className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      )
                    }

                    // Calculate price difference
                    const newNights = Math.ceil(
                      (safeParseDate(dateModification.new_check_out).getTime() -
                        safeParseDate(
                          dateModification.new_check_in,
                        ).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                    const oldNights = Math.ceil(
                      (safeParseDate(booking.check_out).getTime() -
                        safeParseDate(booking.check_in).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                    const nightsDiff = newNights - oldNights
                    const priceDiff =
                      nightsDiff * (booking.room?.price_per_night || 0)
                    const discountMultiplier = booking.discount
                      ? 1 - booking.discount / 100
                      : 1
                    const actualDiff = priceDiff * discountMultiplier

                    return (
                      <>
                        <div className="p-3 bg-primary-50 dark:bg-primary-600/30 rounded-lg text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-primary-600 dark:text-primary-400">
                              New dates:
                            </span>
                          </div>
                          <div className="font-medium text-primary-700 dark:text-primary-300">
                            {format(
                              safeParseDate(dateModification.new_check_in),
                              "PPP",
                            )}{" "}
                            →{" "}
                            {format(
                              safeParseDate(dateModification.new_check_out),
                              "PPP",
                            )}
                          </div>
                          <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                            {newNights} nights
                            {nightsDiff !== 0 && (
                              <span
                                className={
                                  nightsDiff > 0
                                    ? "text-orange-600 dark:text-orange-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }
                              >
                                {" "}
                                (
                                {nightsDiff > 0 ? `+${nightsDiff}` : nightsDiff}
                                )
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDateModification}
                            disabled={modifyDatesMutation.isPending}
                            className={`px-4 py-2.5 font-medium rounded-lg transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-50 text-white ${
                              actualDiff > 0
                                ? "bg-orange-600 hover:bg-orange-700"
                                : actualDiff < 0
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : "bg-primary-600 hover:bg-primary-700"
                            } disabled:bg-neutral-300 dark:disabled:bg-neutral-700 disabled:text-neutral-500 dark:disabled:text-neutral-400`}
                          >
                            {modifyDatesMutation.isPending
                              ? "Saving..."
                              : actualDiff > 0
                                ? "Add Charge & Modify"
                                : actualDiff < 0
                                  ? "Apply Refund & Modify"
                                  : "Modify Dates"}
                          </button>
                          <button
                            onClick={() => {
                              setShowDateModification(false)
                              setDateModification({})
                            }}
                            className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Planned Check-in:
                      </span>
                      <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                        {format(safeParseDate(booking.check_in), "PPP p")}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Planned Check-out:
                      </span>
                      <span className="ml-2 font-medium text-neutral-900 dark:text-white">
                        {format(safeParseDate(booking.check_out), "PPP p")}
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
                              {format(
                                safeParseDate(booking.actual_check_in),
                                "PPP p",
                              )}
                            </span>
                          </div>
                        )}
                        {booking.actual_check_out && (
                          <div>
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Actual Check-out:
                            </span>
                            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                              {format(
                                safeParseDate(booking.actual_check_out),
                                "PPP p",
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Info */}
            <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Payment Details
                  </h3>
                </div>
                {!isEditing && booking.status === "confirmed" && canUpdateDiscount && (
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
                        className="w-full px-5 py-2.5 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-600 dark:text-neutral-400 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2 font-medium"
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
                                className="w-full pl-3 pr-8 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                              className="px-2 py-2 text-danger-600 dark:text-danger-400 hover:bg-danger-100 dark:hover:bg-danger-600/40 rounded-lg transition-colors flex-shrink-0"
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
                            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    <div className="space-y-2 p-3 bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Room Rate:
                        </span>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          ${booking.room?.price_per_night}/night
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Nights:
                        </span>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          {Math.ceil(
                            (safeParseDate(booking.check_out).getTime() -
                              safeParseDate(booking.check_in).getTime()) /
                              (1000 * 60 * 60 * 24),
                          )}
                        </span>
                      </div>
                      <div className="pt-1 border-t border-neutral-200 dark:border-neutral-600 flex justify-between items-center">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          Base Amount:
                        </span>
                        <span className="text-sm font-medium text-neutral-900 dark:text-white">
                          ${formData.totalAmount}
                        </span>
                      </div>
                      {formData.discount > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              Discount ({formData.discount}%):
                            </span>
                            <span className="text-sm text-danger-600 dark:text-danger-400">
                              -$
                              {(
                                (formData.totalAmount * formData.discount) /
                                100
                              ).toFixed(2)}
                            </span>
                          </div>
                          <div className="pt-1 border-t border-neutral-200 dark:border-neutral-600 flex justify-between items-center">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                              Final Amount:
                            </span>
                            <span className="font-bold text-lg text-neutral-900 dark:text-white">
                              $
                              {(
                                formData.totalAmount *
                                (1 - formData.discount / 100)
                              ).toFixed(2)}
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
                                ? "bg-primary-100 dark:bg-primary-600/30 border-primary-500 text-primary-600 dark:text-primary-400"
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
                      className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white font-medium rounded-lg transition-colors text-sm disabled:cursor-not-allowed disabled:text-neutral-500 dark:disabled:text-neutral-400 flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-sm font-medium"
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
                  {booking.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Discount:
                      </span>
                      <span className="text-danger-600 dark:text-danger-400">
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
                    booking.payment_adjustments &&
                    booking.payment_adjustments.length > 0 && (
                      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-600">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                            Payment Adjustments:
                          </span>
                          <div className="flex gap-3">
                            {(() => {
                              const { refundAmount, additionalPayment } =
                                getPaymentAdjustmentSummary(booking)
                              return (
                                <>
                                  {refundAmount > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                      Refunds: -${refundAmount.toFixed(2)}
                                    </span>
                                  )}
                                  {additionalPayment > 0 && (
                                    <span className="text-orange-600 dark:text-orange-400 font-medium text-sm">
                                      Additional: +$
                                      {additionalPayment.toFixed(2)}
                                    </span>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {booking.payment_adjustments.map(
                            (adjustment, index) => (
                              <div
                                key={`${adjustment.type || "adj"}-${adjustment.amount || 0}-${adjustment.created_at || index}`}
                                className="flex justify-between items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-700 rounded text-xs"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-neutral-900 dark:text-white">
                                      {adjustment.type
                                        ?.replace(/_/g, " ")
                                        .replace(/\b\w/g, (l) =>
                                          l.toUpperCase(),
                                        ) || "Unknown"}
                                    </span>
                                    {adjustment.amount && (
                                      <span
                                        className={`font-medium ${
                                          adjustment.amount > 0
                                            ? "text-orange-600 dark:text-orange-400"
                                            : "text-emerald-600 dark:text-emerald-400"
                                        }`}
                                      >
                                        {adjustment.amount > 0 ? "+" : ""}$
                                        {adjustment.amount.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-neutral-600 dark:text-neutral-400 break-words">
                                    {adjustment.reason || "No reason provided"}
                                  </div>
                                  {adjustment.created_at && (
                                    <div className="text-neutral-500 dark:text-neutral-500 mt-1">
                                      {format(
                                        safeParseDate(adjustment.created_at),
                                        "MMM d, yyyy 'at' HH:mm",
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
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
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-500 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {checkInMutation.isPending ? "Processing..." : "Check In"}
                </button>
              )}

              {booking.status === "checked_in" && canCheckInOut() && (
                <button
                  onClick={handleCheckOut}
                  disabled={checkOutMutation.isPending}
                  className="flex-1 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-500 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    className="px-5 py-2.5 border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-600/40 rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="px-5 py-2.5 bg-danger-600 hover:bg-danger-700 disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-500 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
                    >
                      {deleteMutation.isPending
                        ? "Deleting..."
                        : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-5 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors font-medium"
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
