import { changeBookingRoom } from "@/api/bookings"
import { getRooms } from "@/api/rooms"
import type {
  BookingPublic,
  PaymentAdjustmentResponse,
  RoomPublic,
} from "@/client/types.gen"
import { useConfirm } from "@/hooks/useConfirm"
import { showError, showSuccess } from "@/utils/error-handling"
import { isRoomAvailable } from "@/utils/booking-grid"
import { invalidateAfterBookingUpdate } from "@/utils/query-invalidation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"

interface DragState {
  isDragging: boolean
  draggedBooking: BookingPublic | null
  dragOverRoomId: string | null
  isValidDrop: boolean
}

export function useBookingDrag(existingBookings: BookingPublic[]) {
  const queryClient = useQueryClient()
  const dragImageRef = useRef<HTMLDivElement | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedBooking: null,
    dragOverRoomId: null,
    isValidDrop: false,
  })

  // Mutation for changing booking room with payment adjustment
  const changeRoomMutation = useMutation<
    PaymentAdjustmentResponse,
    unknown,
    { id: string; roomId: string; oldRoomId: string }
  >({
    mutationFn: ({ id, roomId }) =>
      changeBookingRoom(id, { new_room_id: roomId }),
    onMutate: async ({ id, roomId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["bookings"] })

      // Snapshot the previous value
      const previousBookings = queryClient.getQueryData(["bookings"])

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ["bookings"] }, (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((booking: BookingPublic) =>
            booking.id === id ? { ...booking, room_id: roomId } : booking,
          ),
        }
      })

      // Return context with snapshot
      return { previousBookings }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousBookings) {
        queryClient.setQueryData(["bookings"], context.previousBookings)
      }
      // Show error message
      showError(err, "Failed to change room")
    },
    onSuccess: (response, variables) => {
      // When moving a checked-in booking, room statuses change:
      // - Old room: OCCUPIED → CLEANING
      // - New room: (any) → OCCUPIED
      invalidateAfterBookingUpdate(queryClient, response.booking.id, {
        roomChanged: true,
        customerChanged: false,
        oldRoomId: variables.oldRoomId,
        newRoomId: variables.roomId,
      })

      // Show payment adjustment notification
      const diff = response.payment_difference
      if (diff > 0) {
        showSuccess(
          `Room changed. Guest needs to pay additional $${diff.toFixed(2)}`,
        )
      } else if (diff < 0) {
        showSuccess(
          `Room changed. Refund amount: $${Math.abs(diff).toFixed(2)}`,
        )
      } else {
        showSuccess("Room changed successfully!")
      }
    },
  })

  // Start dragging
  const handleDragStart = useCallback(
    (e: React.DragEvent, booking: BookingPublic) => {
      // Set drag data
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("bookingId", booking.id)

      // Create custom drag image
      if (dragImageRef.current) {
        const dragImage = dragImageRef.current
        dragImage.textContent = booking.customer
          ? `${booking.customer.first_name} ${booking.customer.last_name}`
          : "Guest"
        dragImage.style.position = "absolute"
        dragImage.style.top = "-1000px"
        dragImage.style.left = "-1000px"
        dragImage.style.padding = "8px 12px"
        dragImage.style.background = "#10b981"
        dragImage.style.color = "white"
        dragImage.style.borderRadius = "6px"
        dragImage.style.fontSize = "12px"
        dragImage.style.fontWeight = "500"
        dragImage.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)"
        document.body.appendChild(dragImage)
        e.dataTransfer.setDragImage(dragImage, 0, 0)

        // Clean up after drag
        setTimeout(() => {
          if (dragImage.parentNode) {
            dragImage.parentNode.removeChild(dragImage)
          }
        }, 0)
      }

      setDragState({
        isDragging: true,
        draggedBooking: booking,
        dragOverRoomId: null,
        isValidDrop: false,
      })
    },
    [],
  )

  // Handle drag over a room
  const handleDragOver = useCallback(
    (e: React.DragEvent, room: RoomPublic) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"

      if (!dragState.draggedBooking) return

      // Check if room is available for this booking
      const isAvailable = isRoomAvailable(
        room.id,
        new Date(dragState.draggedBooking.check_in),
        new Date(dragState.draggedBooking.check_out),
        existingBookings,
        dragState.draggedBooking.id,
      )

      setDragState((prev) => ({
        ...prev,
        dragOverRoomId: room.id,
        isValidDrop: isAvailable,
      }))
    },
    [dragState.draggedBooking, existingBookings],
  )

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Safer approach - check if we're actually leaving the target
    const target = e.currentTarget as HTMLElement
    const related = e.relatedTarget as Node | null

    // Only reset if we're truly leaving (not entering a child element)
    if (!related || !target.contains(related)) {
      setDragState((prev) => ({
        ...prev,
        dragOverRoomId: null,
        isValidDrop: false,
      }))
    }
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    async (e: React.DragEvent, targetRoom: RoomPublic) => {
      e.preventDefault()

      if (!dragState.draggedBooking || !dragState.isValidDrop) {
        // Reset state even if invalid
        setDragState({
          isDragging: false,
          draggedBooking: null,
          dragOverRoomId: null,
          isValidDrop: false,
        })
        return
      }

      // Only update if moving to a different room
      if (dragState.draggedBooking.room_id !== targetRoom.id) {
        const booking = dragState.draggedBooking
        const currentRoom = booking.room
        const priceDiff =
          targetRoom.price_per_night - (currentRoom?.price_per_night || 0)
        const nights = Math.ceil(
          (new Date(booking.check_out).getTime() -
            new Date(booking.check_in).getTime()) /
            (1000 * 60 * 60 * 24),
        )

        // Calculate actual amounts with discount
        const hasDiscount = booking.discount && booking.discount > 0
        const discountMultiplier = hasDiscount ? (1 - booking.discount / 100) : 1
        const totalDiffBeforeDiscount = priceDiff * nights
        const actualDiff = totalDiffBeforeDiscount * discountMultiplier

        // Show confirmation with price difference
        let message = `Move booking from Room ${currentRoom?.room_number} to Room ${targetRoom.room_number}?\n\n`

        if (actualDiff > 0) {
          message += `⚠️ Additional charge: $${actualDiff.toFixed(2)}\n`
          if (hasDiscount) {
            message += `(${nights} nights × $${priceDiff.toFixed(2)}/night with ${booking.discount}% discount)`
          } else {
            message += `(${nights} nights × $${priceDiff.toFixed(2)}/night)`
          }
        } else if (actualDiff < 0) {
          message += `✅ Refund amount: $${Math.abs(actualDiff).toFixed(2)}\n`
          if (hasDiscount) {
            message += `(${nights} nights × $${Math.abs(priceDiff).toFixed(2)}/night with ${booking.discount}% discount)`
          } else {
            message += `(${nights} nights × $${Math.abs(priceDiff).toFixed(2)}/night)`
          }
        } else {
          message += "No price difference"
        }

        const confirmed = await confirm({
          title: "Confirm Room Change",
          message,
          confirmText: "Change Room",
          variant: actualDiff > 0 ? "warning" : actualDiff < 0 ? "success" : "primary",
        })

        if (confirmed) {
          changeRoomMutation.mutate({
            id: booking.id,
            roomId: targetRoom.id,
            oldRoomId: booking.room_id,
          })
        }
      }

      // Reset drag state
      setDragState({
        isDragging: false,
        draggedBooking: null,
        dragOverRoomId: null,
        isValidDrop: false,
      })
    },
    [dragState, changeRoomMutation, confirm],
  )

  // Handle drag end (cleanup)
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedBooking: null,
      dragOverRoomId: null,
      isValidDrop: false,
    })
  }, [])

  // Create drag image container
  const createDragImageContainer = useCallback(() => {
    if (!dragImageRef.current) {
      const div = document.createElement("div")
      dragImageRef.current = div
    }
    return dragImageRef.current
  }, [])

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    createDragImageContainer,
    isUpdating: changeRoomMutation.isPending,
    ConfirmDialog,
  }
}
