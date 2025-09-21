import { changeBookingRoom } from "@/api/bookings"
import type {
  BookingPublic,
  PaymentAdjustmentResponse,
  RoomPublic,
} from "@/client/types.gen"
import { isRoomAvailable } from "@/utils/booking-grid"
import { safeParseDate } from "@/utils/date-helpers"
import { differenceInDays } from "date-fns"
import { showError, showSuccess } from "@/utils/error-handling"
import { invalidateAfterBookingUpdate } from "@/utils/query-invalidation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"

interface DragState {
  isDragging: boolean
  draggedBooking: BookingPublic | null
  dragOverRoomId: string | null
  isValidDrop: boolean
}

export interface RoomChangeData {
  booking: BookingPublic
  fromRoom: RoomPublic | undefined
  toRoom: RoomPublic
  priceDiff: number
  nights: number
  discount: number | undefined
  actualDiff: number
}

interface BookingsQueryData {
  data: BookingPublic[]
  count: number
}

export function useBookingDrag(existingBookings: BookingPublic[]) {
  const queryClient = useQueryClient()

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
      const previousBookings = queryClient.getQueryData<BookingsQueryData>([
        "bookings",
      ])

      // Optimistically update to the new value
      queryClient.setQueriesData<BookingsQueryData>(
        { queryKey: ["bookings"] },
        (old) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((booking) =>
              booking.id === id ? { ...booking, room_id: roomId } : booking,
            ),
          }
        },
      )

      // Return context with snapshot
      return { previousBookings }
    },
    onError: (err, _variables, context) => {
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

  // Calculate room change price difference
  const calculateRoomChangeData = useCallback(
    (booking: BookingPublic, targetRoom: RoomPublic): RoomChangeData => {
      const currentRoom = booking.room
      const priceDiff =
        targetRoom.price_per_night - (currentRoom?.price_per_night || 0)
      // Calculate nights the same way as backend: difference in days only
      const checkIn = safeParseDate(booking.check_in)
      const checkOut = safeParseDate(booking.check_out)
      const nights = Math.max(1, differenceInDays(checkOut, checkIn))

      // Calculate actual amounts with discount
      const hasDiscount = booking.discount && booking.discount > 0
      const discountMultiplier = hasDiscount ? 1 - booking.discount / 100 : 1
      const totalDiffBeforeDiscount = priceDiff * nights
      const actualDiff = totalDiffBeforeDiscount * discountMultiplier

      return {
        booking,
        fromRoom: currentRoom,
        toRoom: targetRoom,
        priceDiff,
        nights,
        discount: booking.discount,
        actualDiff,
      }
    },
    [],
  )

  // Start dragging
  const handleDragStart = useCallback(
    (e: React.DragEvent, booking: BookingPublic) => {
      // Set drag data
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("bookingId", booking.id)

      // Add dragging class to the element being dragged
      const element = e.currentTarget as HTMLElement
      element.classList.add("dragging")

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
        safeParseDate(dragState.draggedBooking.check_in),
        safeParseDate(dragState.draggedBooking.check_out),
        existingBookings,
        dragState.draggedBooking.id,
      )

      setDragState((prev) => ({
        ...prev,
        dragOverRoomId: room.id,
        isValidDrop:
          isAvailable && room.id !== dragState.draggedBooking.room_id,
      }))
    },
    [dragState.draggedBooking, existingBookings],
  )

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Check if we're actually leaving the drop zone
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

  // Handle drop - returns data for confirmation
  const handleDrop = useCallback(
    async (
      e: React.DragEvent,
      targetRoom: RoomPublic,
      onConfirm?: (data: RoomChangeData) => Promise<boolean>,
    ) => {
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
        const roomChangeData = calculateRoomChangeData(
          dragState.draggedBooking,
          targetRoom,
        )

        // If a confirmation handler is provided, use it
        // Otherwise proceed with the change
        const confirmed = onConfirm ? await onConfirm(roomChangeData) : true

        if (confirmed) {
          changeRoomMutation.mutate({
            id: dragState.draggedBooking.id,
            roomId: targetRoom.id,
            oldRoomId: dragState.draggedBooking.room_id,
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
    [dragState, changeRoomMutation, calculateRoomChangeData],
  )

  // Handle drag end (cleanup)
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Remove dragging class
    const element = e.currentTarget as HTMLElement
    element.classList.remove("dragging")

    setDragState({
      isDragging: false,
      draggedBooking: null,
      dragOverRoomId: null,
      isValidDrop: false,
    })
  }, [])

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    calculateRoomChangeData,
    isUpdating: changeRoomMutation.isPending,
  }
}
