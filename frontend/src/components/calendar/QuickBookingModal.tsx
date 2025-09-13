import { type QuickBookingParams, createQuickBooking } from "@/api/bookings"
import { getCustomers } from "@/api/customers"
import type { RoomPublic } from "@/client/types.gen"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { getDefaultCheckoutTime } from "@/types/booking"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarDays, Clock, DollarSign, User, X } from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

interface QuickBookingModalProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
  initialCheckIn: Date
  rooms: RoomPublic[]
}

export function QuickBookingModal({
  isOpen,
  onClose,
  roomId,
  initialCheckIn,
  rooms,
}: QuickBookingModalProps) {
  const queryClient = useQueryClient()

  // Find the selected room
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === roomId),
    [rooms, roomId],
  )

  // Form state
  const [checkIn, setCheckIn] = useState(
    initialCheckIn.toISOString().slice(0, 16),
  )
  const [checkOut, setCheckOut] = useState(
    getDefaultCheckoutTime(initialCheckIn).toISOString().slice(0, 16),
  )
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Calculate total amount
  const totalAmount = useMemo(() => {
    if (!selectedRoom) return 0

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const hours =
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)
    const days = Math.max(1, Math.ceil(hours / 24))

    return selectedRoom.price_per_night * days
  }, [checkIn, checkOut, selectedRoom])

  // Fetch customers for dropdown
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["customers", "search"],
    queryFn: () => getCustomers({ limit: 100 }),
    enabled: isOpen,
  })

  // Customer options for SearchableSelect
  const customerOptions = useMemo(() => {
    if (!customersData?.data) return []

    return customersData.data.map((customer) => ({
      value: customer.id,
      label: `${customer.first_name} ${customer.last_name}${customer.phone ? ` (${customer.phone})` : ""}`,
    }))
  }, [customersData])

  // Create booking mutation
  const createMutation = useMutation({
    mutationFn: createQuickBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      queryClient.invalidateQueries({ queryKey: ["bookings", "calendar"] })
      onClose()
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
        setErrors({ general: "Failed to create booking" })
      }
    },
  })

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}

    if (!customerId) {
      newErrors.customer_id = "Please select a customer"
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    if (checkInDate >= checkOutDate) {
      newErrors.check_out = "Check-out must be after check-in"
    }

    if (checkInDate < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      newErrors.check_in = "Check-in cannot be in the past"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    createMutation.mutate({
      customerId: customerId!,
      roomId: roomId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
    })
  }

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCheckIn(initialCheckIn.toISOString().slice(0, 16))
      setCheckOut(
        getDefaultCheckoutTime(initialCheckIn).toISOString().slice(0, 16),
      )
      setCustomerId(null)
      setErrors({})
    }
  }, [isOpen, initialCheckIn])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-2 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Quick Booking
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Room {selectedRoom?.room_number} • Floor {selectedRoom?.floor}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.general}
              </p>
            </div>
          )}

          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Customer *
            </label>
            <SearchableSelect
              value={customerId}
              onChange={setCustomerId}
              options={customerOptions}
              placeholder={
                customersLoading
                  ? "Loading customers..."
                  : "Search and select customer"
              }
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
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={`
                  w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors
                  ${
                    errors.check_in
                      ? "border-red-300 dark:border-red-600"
                      : "border-neutral-300 dark:border-neutral-600"
                  }
                  bg-white dark:bg-transparent
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                `}
                required
              />
            </div>
            {errors.check_in && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.check_in}
              </p>
            )}
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
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={`
                  w-full pl-10 pr-4 py-2.5 rounded-lg border transition-colors
                  ${
                    errors.check_out
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

          {/* Price Calculation */}
          <div className="p-4 rounded-lg bg-neutral-50 dark:bg-dark-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Room Rate
              </span>
              <span className="text-sm font-medium">
                ${selectedRoom?.price_per_night}/night
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-lg font-bold text-neutral-900 dark:text-white">
                  Total Amount
                </span>
              </div>
              <span className="text-lg font-bold text-green-600">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-neutral-600 px-6 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
