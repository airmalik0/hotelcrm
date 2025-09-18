import { createBooking } from "@/api/bookings"
import { getCustomers } from "@/api/customers"
import { getRooms } from "@/api/rooms"
import type {
  BookingCreate,
  CustomerPublic,
  RoomPublic,
} from "@/client/types.gen"
import { CreateCustomerModal } from "@/components/customers/CreateCustomerModal"
import { invalidateAfterBookingCreate } from "@/utils/query-invalidation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import { addDays, format, setHours, setMinutes } from "date-fns"
import {
  Bed,
  Calendar,
  Clock,
  DollarSign,
  Phone as PhoneIcon,
  Plus,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react"
import { memo, useEffect, useState } from "react"

interface QuickBookingModalProps {
  isOpen: boolean
  onClose: () => void
  room?: RoomPublic
  checkIn?: Date
  checkOut?: Date
}

export const QuickBookingModal = memo(function QuickBookingModal({
  isOpen,
  onClose,
  room,
  checkIn: initialCheckIn,
  checkOut: initialCheckOut,
}: QuickBookingModalProps) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerPublic | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<RoomPublic | null>(null)
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false)

  // Form state
  const [formData, setFormData] = useState<{
    checkIn: string
    checkOut: string
    checkInDate: string
    checkInTime: string
    checkOutDate: string
    checkOutTime: string
    totalAmount: number
    discount: number
    discountReason: string
    paymentMethod: "cash" | "transfer" | "terminal"
  }>({
    checkIn: "",
    checkOut: "",
    checkInDate: "",
    checkInTime: "",
    checkOutDate: "",
    checkOutTime: "",
    totalAmount: 0,
    discount: 0,
    discountReason: "",
    paymentMethod: "cash",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Set initial room
  useEffect(() => {
    if (room) {
      setSelectedRoom(room)
    }
  }, [room])

  // Set initial dates
  useEffect(() => {
    if (initialCheckIn && initialCheckOut) {
      setFormData((prev) => ({
        ...prev,
        checkIn: format(initialCheckIn, "yyyy-MM-dd'T'HH:mm"),
        checkOut: format(initialCheckOut, "yyyy-MM-dd'T'HH:mm"),
        checkInDate: format(initialCheckIn, "yyyy-MM-dd"),
        checkInTime: format(initialCheckIn, "HH:mm"),
        checkOutDate: format(initialCheckOut, "yyyy-MM-dd"),
        checkOutTime: format(initialCheckOut, "HH:mm"),
      }))
    } else if (initialCheckIn) {
      // Default checkout: next day at 12:00
      const defaultCheckOut = setHours(
        setMinutes(addDays(initialCheckIn, 1), 0),
        12,
      )
      setFormData((prev) => ({
        ...prev,
        checkIn: format(initialCheckIn, "yyyy-MM-dd'T'HH:mm"),
        checkOut: format(defaultCheckOut, "yyyy-MM-dd'T'HH:mm"),
        checkInDate: format(initialCheckIn, "yyyy-MM-dd"),
        checkInTime: format(initialCheckIn, "HH:mm"),
        checkOutDate: format(defaultCheckOut, "yyyy-MM-dd"),
        checkOutTime: format(defaultCheckOut, "HH:mm"),
      }))
    }
  }, [initialCheckIn, initialCheckOut])

  // Update combined datetime when date or time changes
  useEffect(() => {
    if (formData.checkInDate && formData.checkInTime) {
      setFormData((prev) => ({
        ...prev,
        checkIn: `${formData.checkInDate}T${formData.checkInTime}`,
      }))
    }
  }, [formData.checkInDate, formData.checkInTime])

  useEffect(() => {
    if (formData.checkOutDate && formData.checkOutTime) {
      setFormData((prev) => ({
        ...prev,
        checkOut: `${formData.checkOutDate}T${formData.checkOutTime}`,
      }))
    }
  }, [formData.checkOutDate, formData.checkOutTime])

  // Calculate total amount when dates or room change
  useEffect(() => {
    const activeRoom = room || selectedRoom
    if (formData.checkIn && formData.checkOut && activeRoom) {
      const start = new Date(formData.checkIn)
      const end = new Date(formData.checkOut)
      const nights = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      )
      const total = nights * activeRoom.price_per_night
      setFormData((prev) => ({
        ...prev,
        totalAmount: Math.max(total - prev.discount, 0),
      }))
    }
  }, [
    formData.checkIn,
    formData.checkOut,
    formData.discount,
    room,
    selectedRoom,
  ])

  // Fetch rooms if not provided
  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => getRooms({ limit: 100 }),
    enabled: !room && isOpen,
  })

  // Search customers
  const { data: customersData } = useQuery({
    queryKey: ["customers", searchTerm],
    queryFn: () => getCustomers({ search: searchTerm, limit: 10 }),
    enabled: searchTerm.length > 0,
  })

  // Reset form state
  const resetForm = () => {
    setSearchTerm("")
    setSelectedCustomer(null)
    setSelectedRoom(null)
    setShowCustomerDropdown(false)
    setShowCreateCustomerModal(false)
    setFormData({
      checkIn: "",
      checkOut: "",
      checkInDate: "",
      checkInTime: "",
      checkOutDate: "",
      checkOutTime: "",
      totalAmount: 0,
      discount: 0,
      discountReason: "",
      paymentMethod: "cash",
    })
    setErrors({})
  }

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: BookingCreate) => createBooking(data),
    onSuccess: (createdBooking, variables) => {
      // Invalidate bookings and customer stats (backend updates total_bookings and total_spent)
      invalidateAfterBookingCreate(
        queryClient,
        variables.customer_id,
        variables.room_id,
      )
      resetForm()
      onClose()
    },
  })

  // Handle customer creation success
  const handleCustomerCreated = (newCustomer: CustomerPublic) => {
    setSelectedCustomer(newCustomer)
    setSearchTerm("")
    setShowCreateCustomerModal(false)
    setShowCustomerDropdown(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const activeRoom = room || selectedRoom
    if (!selectedCustomer || !activeRoom) {
      setErrors({ customer: "Please select a customer" })
      return
    }

    // Room status validation - only MAINTENANCE prevents booking
    // OCCUPIED and CLEANING rooms can be booked for future dates
    if (activeRoom.status === "maintenance") {
      setErrors({ room: "Cannot book a room that is under maintenance" })
      return
    }

    // Validate dates are not in the past
    const checkInDate = new Date(formData.checkIn)
    const now = new Date()
    if (checkInDate < now) {
      setErrors({ dates: "Check-in date cannot be in the past" })
      return
    }

    // Validate discount reason
    if (formData.discount > 0 && !formData.discountReason.trim()) {
      setErrors({
        discountReason: "Discount reason is required when discount is applied",
      })
      return
    }

    const bookingData: BookingCreate = {
      customer_id: selectedCustomer.id,
      room_id: activeRoom.id,
      check_in: new Date(formData.checkIn).toISOString(),
      check_out: new Date(formData.checkOut).toISOString(),
      total_amount: formData.totalAmount,
      discount: formData.discount || undefined,
      discount_reason:
        formData.discount > 0 ? formData.discountReason : undefined,
      payment_method: formData.paymentMethod,
      status: "confirmed",
    }

    createBookingMutation.mutate(bookingData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-2 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-600">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Quick Booking
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>
          {room && (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Room {room.room_number} - {room.room_type}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Room Selection - only show if room not provided */}
          {!room && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Room
              </label>
              <select
                value={selectedRoom?.id || ""}
                onChange={(e) => {
                  const room = roomsData?.data.find(
                    (r) => r.id === e.target.value,
                  )
                  setSelectedRoom(room || null)
                }}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select a room</option>
                {roomsData?.data.map((room) => (
                  <option
                    key={room.id}
                    value={room.id}
                    disabled={room.status === "maintenance"}
                  >
                    Room {room.room_number} - {room.room_type} ($
                    {room.price_per_night}/night)
                    {room.status === "maintenance" && " [MAINTENANCE - UNAVAILABLE]"}
                    {room.status === "occupied" && " [OCCUPIED]"}
                    {room.status === "cleaning" && " [CLEANING]"}
                  </option>
                ))}
              </select>
              {selectedRoom && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>${selectedRoom.price_per_night}/night</span>
                    </div>
                  </div>
                  {/* Room Status Warning */}
                  {selectedRoom.status === "maintenance" && (
                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
                      <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                        ⚠️ Room is under maintenance. Cannot create booking.
                      </p>
                    </div>
                  )}
                  {selectedRoom.status === "occupied" && (
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700">
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        ℹ️ Room is currently occupied. You can book it for future dates.
                      </p>
                    </div>
                  )}
                  {selectedRoom.status === "cleaning" && (
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700">
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">
                        ℹ️ Room is being cleaned. You can book it for future dates.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Customer Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Guest
            </label>

            {selectedCustomer ? (
              // Selected customer display
              <div className="flex items-center gap-2 p-3 border border-primary-500 dark:border-primary-600 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </span>
                  </div>
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <PhoneIcon className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {selectedCustomer.phone}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null)
                    setSearchTerm("")
                  }}
                  className="p-1 hover:bg-primary-200 dark:hover:bg-primary-700/30 rounded-full transition-colors"
                  title="Clear selection"
                >
                  <XCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </button>
              </div>
            ) : (
              // Customer search
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setShowCustomerDropdown(true)
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Search for guest..."
                      className={`w-full pl-10 pr-3 py-2 border ${
                        errors.customer
                          ? "border-danger-500 focus:ring-danger-500"
                          : "border-neutral-300 dark:border-neutral-600 focus:ring-primary-500"
                      } rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomerModal(true)}
                    className="p-2 bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-600/35 transition-colors"
                    title="Create new customer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Customer dropdown */}
                {showCustomerDropdown && searchTerm && customersData?.data && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-48 overflow-auto z-10">
                    {customersData.data?.length > 0 ? (
                      customersData.data.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setSearchTerm("")
                            setShowCustomerDropdown(false)
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
                        >
                          <div className="text-sm font-medium text-neutral-900 dark:text-white">
                            {customer.first_name} {customer.last_name}
                          </div>
                          {customer.phone && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {customer.phone}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                        No customers found. Click + to create new.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {errors.customer && (
              <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                {errors.customer}
              </p>
            )}
          </div>

          {/* Date/Time Selection */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Check-in & Check-out
            </h3>

            <div className="space-y-3">
              {/* Check-in */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Check-in
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formData.checkInDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        checkInDate: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <input
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        checkInTime: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              {/* Check-out */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Check-out
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formData.checkOutDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        checkOutDate: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <input
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        checkOutTime: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Price & Payment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Total Amount
              </label>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                ${formData.totalAmount}
              </div>
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Discount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        discount: Number(e.target.value),
                      }))
                    }
                    min="0"
                    max={formData.totalAmount}
                    className="w-full pl-8 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason{" "}
                  {formData.discount > 0 && (
                    <span className="text-danger-600 dark:text-danger-400">
                      *
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
                  placeholder={formData.discount > 0 ? "Required" : "Optional"}
                  className={`w-full px-3 py-2 border ${
                    errors.discountReason
                      ? "border-danger-500 focus:ring-danger-500"
                      : "border-neutral-300 dark:border-neutral-600 focus:ring-primary-500"
                  } rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2`}
                  required={formData.discount > 0}
                />
                {errors.discountReason && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    {errors.discountReason}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "terminal", "transfer"] as const).map((method) => (
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
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedCustomer || createBookingMutation.isPending}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
            >
              {createBookingMutation.isPending
                ? "Creating..."
                : "Create Booking"}
            </button>
          </div>
        </form>
      </div>

      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <CreateCustomerModal
          isOpen={showCreateCustomerModal}
          onClose={() => setShowCreateCustomerModal(false)}
          onSuccess={handleCustomerCreated}
        />
      )}
    </div>
  )
})
