import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format, setHours, setMinutes, addDays } from "date-fns"
import type { BookingCreate, RoomPublic, CustomerPublic } from "@/client/types.gen"
import { createBooking } from "@/api/bookings"
import { getCustomers } from "@/api/customers"
import { getRooms } from "@/api/rooms"
import { X, Calendar, Clock, User, DollarSign, Search, Plus, Bed } from "lucide-react"
import clsx from "clsx"

interface QuickBookingModalProps {
  isOpen: boolean
  onClose: () => void
  room?: RoomPublic
  checkIn?: Date
  checkOut?: Date
}

export function QuickBookingModal({
  isOpen,
  onClose,
  room,
  checkIn: initialCheckIn,
  checkOut: initialCheckOut,
}: QuickBookingModalProps) {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerPublic | null>(null)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<RoomPublic | null>(null)

  // Form state
  const [formData, setFormData] = useState<{
    checkIn: string
    checkOut: string
    totalAmount: number
    discount: number
    discountReason: string
    paymentMethod: "CASH" | "CARD" | "ONLINE"
  }>({
    checkIn: "",
    checkOut: "",
    totalAmount: 0,
    discount: 0,
    discountReason: "",
    paymentMethod: "CASH",
  })

  // Set initial room
  useEffect(() => {
    if (room) {
      setSelectedRoom(room)
    }
  }, [room])

  // Set initial dates
  useEffect(() => {
    if (initialCheckIn && initialCheckOut) {
      setFormData(prev => ({
        ...prev,
        checkIn: format(initialCheckIn, "yyyy-MM-dd'T'HH:mm"),
        checkOut: format(initialCheckOut, "yyyy-MM-dd'T'HH:mm"),
      }))
    } else if (initialCheckIn) {
      // Default checkout: next day at 12:00
      const defaultCheckOut = setHours(setMinutes(addDays(initialCheckIn, 1), 0), 12)
      setFormData(prev => ({
        ...prev,
        checkIn: format(initialCheckIn, "yyyy-MM-dd'T'HH:mm"),
        checkOut: format(defaultCheckOut, "yyyy-MM-dd'T'HH:mm"),
      }))
    }
  }, [initialCheckIn, initialCheckOut])

  // Calculate total amount when dates or room change
  useEffect(() => {
    const activeRoom = room || selectedRoom
    if (formData.checkIn && formData.checkOut && activeRoom) {
      const start = new Date(formData.checkIn)
      const end = new Date(formData.checkOut)
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const total = nights * activeRoom.price_per_night
      setFormData(prev => ({
        ...prev,
        totalAmount: Math.max(total - prev.discount, 0),
      }))
    }
  }, [formData.checkIn, formData.checkOut, formData.discount, room, selectedRoom])

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
    setFormData({
      checkIn: "",
      checkOut: "",
      totalAmount: 0,
      discount: 0,
      discountReason: "",
      paymentMethod: "CASH",
    })
  }

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (data: BookingCreate) => createBooking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      resetForm()
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const activeRoom = room || selectedRoom
    if (!selectedCustomer || !activeRoom) return

    const bookingData: BookingCreate = {
      customer_id: selectedCustomer.id,
      room_id: activeRoom.id,
      check_in: new Date(formData.checkIn).toISOString(),
      check_out: new Date(formData.checkOut).toISOString(),
      total_amount: formData.totalAmount,
      discount: formData.discount || undefined,
      discount_reason: formData.discountReason || undefined,
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
                  const room = roomsData?.data.find(r => r.id === e.target.value)
                  setSelectedRoom(room || null)
                }}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Select a room</option>
                {roomsData?.data.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number} - {room.room_type} (${room.price_per_night}/night)
                  </option>
                ))}
              </select>
              {selectedRoom && (
                <div className="mt-2 flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-1">
                    <Bed className="w-3 h-3" />
                    <span>Capacity: {selectedRoom.capacity}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span>${selectedRoom.price_per_night}/night</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Customer Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Guest
            </label>
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={selectedCustomer ? selectedCustomer.full_name : searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setShowCustomerDropdown(true)
                      if (selectedCustomer) setSelectedCustomer(null)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Search or select guest"
                    className="w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <button
                  type="button"
                  className="p-2 bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-600/35 transition-colors"
                  title="Create new customer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Customer dropdown */}
              {showCustomerDropdown && searchTerm && customersData?.data && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg max-h-48 overflow-auto z-10">
                  {customersData.data.length > 0 ? (
                    customersData.data.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setSearchTerm(customer.full_name)
                          setShowCustomerDropdown(false)
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
                      >
                        <div className="text-sm font-medium text-neutral-900 dark:text-white">
                          {customer.full_name}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {customer.email}
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date/Time Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Check-in
              </label>
              <input
                type="datetime-local"
                value={formData.checkIn}
                onChange={(e) => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Check-out
              </label>
              <input
                type="datetime-local"
                value={formData.checkOut}
                onChange={(e) => setFormData(prev => ({ ...prev, checkOut: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
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
                <input
                  type="number"
                  value={formData.discount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
                  min="0"
                  max={formData.totalAmount}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={formData.discountReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountReason: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["CASH", "CARD", "ONLINE"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                    className={clsx(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      formData.paymentMethod === method
                        ? "bg-primary-100 dark:bg-primary-600/25 border-primary-500 text-primary-600 dark:text-primary-400"
                        : "bg-white dark:bg-dark-3 border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3"
                    )}
                  >
                    {method}
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
              {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}