import { addGuestToBooking } from "@/api/bookings"
import { getCustomers } from "@/api/customers"
import type {
  BookingGuestCreate,
  BookingGuestPublic,
  CustomerPublic,
} from "@/client/types.gen"
import { GeoSelect } from "@/components/ui/GeoSelect"
import { useLanguage } from "@/contexts/LanguageContext"
import { handleFormError, showSuccess } from "@/utils/error-handling"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Search, UserPlus, X } from "lucide-react"
import { memo, useMemo, useState } from "react"
import { PassportUploadInput } from "./PassportUploadInput"

interface AddGuestModalProps {
  isOpen: boolean
  onClose: () => void
  bookingId: string
  onSuccess?: (guest: BookingGuestPublic) => void
}

type FormMode = "search" | "new"

export const AddGuestModal = memo(function AddGuestModal({
  isOpen,
  onClose,
  bookingId,
  onSuccess,
}: AddGuestModalProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<FormMode>("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerPublic | null>(null)

  const [formData, setFormData] = useState<{
    first_name: string
    last_name: string
    passport_photo_path: string | null
    phone: string
    country_code: string | null
    region: string | null
    district: string | null
  }>({
    first_name: "",
    last_name: "",
    passport_photo_path: null,
    phone: "",
    country_code: null,
    region: null,
    district: null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch customers for search
  const { data: customersData } = useQuery({
    queryKey: ["customers", "search"],
    queryFn: () => getCustomers({ limit: 1000 }),
    enabled: isOpen && mode === "search",
  })

  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!customersData?.data || !searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()
    return customersData.data
      .filter((customer) => {
        const fullName =
          `${customer.first_name} ${customer.last_name}`.toLowerCase()
        const phone = customer.phone?.toLowerCase() || ""
        return fullName.includes(query) || phone.includes(query)
      })
      .slice(0, 10) // Limit to 10 results
  }, [customersData, searchQuery])

  const addGuestMutation = useMutation({
    mutationFn: (data: BookingGuestCreate) =>
      addGuestToBooking(bookingId, data),
    onSuccess: (newGuest) => {
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] })
      queryClient.invalidateQueries({
        queryKey: ["booking-guests", bookingId],
      })
      showSuccess(t.booking.guestAddedSuccess)
      onSuccess?.(newGuest)
      resetForm()
      onClose()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        t.booking.failedToAddGuest,
      )
    },
  })

  const resetForm = () => {
    setMode("search")
    setSearchQuery("")
    setSelectedCustomer(null)
    setFormData({
      first_name: "",
      last_name: "",
      passport_photo_path: null,
      phone: "",
      country_code: null,
      region: null,
      district: null,
    })
    setErrors({})
  }

  const handleSelectCustomer = (customer: CustomerPublic) => {
    setSelectedCustomer(customer)
    setFormData({
      first_name: "",
      last_name: "",
      passport_photo_path: customer.passport_photo_path,
      phone: customer.phone || "",
      country_code: customer.country_code || null,
      region: customer.region || null,
      district: customer.district || null,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}

    if (
      mode === "new" &&
      (!formData.first_name.trim() || !formData.last_name.trim())
    ) {
      if (!formData.first_name.trim())
        newErrors.first_name = t.customer.firstNameRequired
      if (!formData.last_name.trim())
        newErrors.last_name = t.customer.lastNameRequired
    }

    // Passport requirement:
    // - For new guest: require uploaded passport (form field)
    // - For existing customer: require that customer already has passport on file
    if (!selectedCustomer) {
      if (!formData.passport_photo_path) {
        newErrors.passport_photo_path = t.booking.passportPhotoRequired
      }
    } else if (!selectedCustomer.passport_photo_path) {
      newErrors.general = t.booking.selectedCustomerNoPassport
    }

    // Geo validation: allow empty overall, but if country is non-UZ, region/district must be empty (handled in backend)

    if (formData.phone?.trim()) {
      const digitsOnly = formData.phone.replace(/\D/g, "")
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        newErrors.phone = t.booking.phoneMustContain
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const guestData: BookingGuestCreate = {
      customer_id: selectedCustomer?.id || null,
      first_name: selectedCustomer ? null : formData.first_name.trim() || null,
      last_name: selectedCustomer ? null : formData.last_name.trim() || null,
      passport_photo_path: selectedCustomer
        ? (selectedCustomer.passport_photo_path as string)
        : (formData.passport_photo_path as string),
      phone: formData.phone.trim() || null,
      country_code: formData.country_code,
      region: formData.region,
      district: formData.district as any,
      is_primary: false,
    } as any

    addGuestMutation.mutate(guestData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-600">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {t.booking.addGuestToBooking}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("search")}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "search"
                  ? "bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <Search className="w-4 h-4 inline-block mr-2" />
              {t.booking.searchExisting}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("new")
                setSelectedCustomer(null)
              }}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "new"
                  ? "bg-white dark:bg-neutral-800 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <UserPlus className="w-4 h-4 inline-block mr-2" />
              {t.booking.addNewGuest}
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Alert */}
          {errors.general && (
            <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-600/20 text-danger-600 dark:text-danger-400 rounded-lg text-sm border border-danger-200 dark:border-danger-600/30">
              {errors.general}
            </div>
          )}

          {/* Search Mode */}
          {mode === "search" && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
                  {t.booking.searchCustomer}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.booking.searchByNameOrPhone}
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {searchQuery.trim() && filteredCustomers.length > 0 && (
                <div className="border border-neutral-200 dark:border-neutral-600 rounded-lg divide-y divide-neutral-200 dark:divide-neutral-600 max-h-60 overflow-y-auto">
                  {filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className={`w-full px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? "bg-primary-50 dark:bg-primary-600/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-50">
                            {customer.first_name} {customer.last_name}
                          </p>
                          {customer.phone && (
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {customer.phone}
                            </p>
                          )}
                        </div>
                        {selectedCustomer?.id === customer.id && (
                          <Check className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.trim() && filteredCustomers.length === 0 && (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  {t.booking.noCustomersFoundTryAdding}
                </div>
              )}
            </div>
          )}

          {/* Selected customer info (no extra fields needed) */}
          {selectedCustomer && (
            <div className="p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg mb-6">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t.booking.selectedCustomer}{" "}
                <span className="font-medium text-neutral-900 dark:text-neutral-50">
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                </span>
              </p>
            </div>
          )}

          {/* Guest Details Form (new guest only) */}
          {mode === "new" && (
            <div className="space-y-4">
              {/* First/Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
                    {t.customer.firstName}{" "}
                    <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-2 border ${
                      errors.first_name
                        ? "border-danger-500 focus:ring-danger-500"
                        : "border-neutral-300 dark:border-neutral-500 focus:ring-primary-500"
                    } rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2`}
                    placeholder={t.customer.enterFirstName}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                      {errors.first_name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
                    {t.customer.lastName}{" "}
                    <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    className={`w-full px-3 py-2 border ${
                      errors.last_name
                        ? "border-danger-500 focus:ring-danger-500"
                        : "border-neutral-300 dark:border-neutral-500 focus:ring-primary-500"
                    } rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2`}
                    placeholder={t.customer.enterLastName}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                      {errors.last_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Passport Photo */}
              <PassportUploadInput
                value={formData.passport_photo_path}
                onChange={(path) =>
                  setFormData((prev) => ({
                    ...prev,
                    passport_photo_path: path,
                  }))
                }
                required
                error={errors.passport_photo_path}
              />

              {/* Location (Geo) */}
              <GeoSelect
                value={{
                  country_code: formData.country_code,
                  region: formData.region,
                  district: formData.district,
                }}
                onChange={(geo) =>
                  setFormData((prev) => ({
                    ...prev,
                    country_code: geo.country_code,
                    region: geo.region,
                    district: geo.district,
                  }))
                }
              />

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
                  {t.customer.phoneNumber}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className={`w-full px-3 py-2 border ${
                    errors.phone
                      ? "border-danger-500 focus:ring-danger-500"
                      : "border-neutral-300 dark:border-neutral-500 focus:ring-primary-500"
                  } rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2`}
                  placeholder="+998901234567"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-neutral-200 dark:border-neutral-600">
            <button
              type="button"
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={
                addGuestMutation.isPending ||
                (mode === "search" && !selectedCustomer)
              }
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
            >
              {addGuestMutation.isPending
                ? t.booking.adding
                : t.booking.addGuest}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})
