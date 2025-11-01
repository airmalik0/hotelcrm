import { createCustomer } from "@/api/customers"
import type {
  CustomerCreate,
  CustomerPublic,
  District,
} from "@/client/types.gen"
import { GeoSelect, type GeoValue } from "@/components/ui/GeoSelect"
import { ImageUpload } from "@/components/ui/ImageUpload"
import { useLanguage } from "@/contexts/LanguageContext"
import { handleFormError, showSuccess } from "@/utils/error-handling"
import { generateCyrillicName } from "@/utils/transliteration"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Calendar,
  Camera,
  FileText,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"

interface CreateCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (customer: CustomerPublic) => void
}

// Legacy district-only UI removed; using GeoSelect

export const CreateCustomerModal = memo(function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCustomerModalProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<{
    first_name: string
    last_name: string
    name_cyrillic: string
    phone: string
    date_of_birth: string
    geo: GeoValue
    passport_photo_path: string | null
    notes: string
  }>({
    first_name: "",
    last_name: "",
    name_cyrillic: "",
    phone: "",
    date_of_birth: "",
    geo: { country_code: "UZ", region: null, district: null },
    passport_photo_path: null,
    notes: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const isManualCyrillicEdit = useRef(false)

  // Auto-generate name_cyrillic from first_name
  useEffect(() => {
    if (formData.first_name && !isManualCyrillicEdit.current) {
      const cyrillicName = generateCyrillicName(formData.first_name)
      setFormData((prev) => ({
        ...prev,
        name_cyrillic: cyrillicName,
      }))
    }
  }, [formData.first_name])

  const createMutation = useMutation({
    mutationFn: (data: CustomerCreate) => createCustomer(data),
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      showSuccess(t.customer.customerCreatedSuccess)
      onSuccess?.(newCustomer)
      resetForm()
      onClose()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        t.customer.failedToCreate,
      )
    },
  })

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      name_cyrillic: "",
      phone: "",
      date_of_birth: "",
      geo: { country_code: "UZ", region: null, district: null },
      passport_photo_path: null,
      notes: "",
    })
    setErrors({})
    isManualCyrillicEdit.current = false
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required"
    } else if (formData.first_name.trim().length > 100) {
      newErrors.first_name = "First name must be 100 characters or less"
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required"
    } else if (formData.last_name.trim().length > 100) {
      newErrors.last_name = "Last name must be 100 characters or less"
    }
    if (formData.phone) {
      const digitsOnly = formData.phone.replace(/\D/g, "")
      if (
        digitsOnly.length > 0 &&
        (digitsOnly.length < 7 || digitsOnly.length > 15)
      ) {
        newErrors.phone = "Phone number must contain between 7 and 15 digits"
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const customerData: CustomerCreate = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      name_cyrillic: formData.name_cyrillic.trim() || null,
      phone: formData.phone.trim() || null,
      date_of_birth: formData.date_of_birth || null,
      country_code: formData.geo.country_code,
      region: formData.geo.region,
      district: (formData.geo.district as District | null) || null,
      passport_photo_path: formData.passport_photo_path,
      notes: formData.notes.trim() || null,
    }

    createMutation.mutate(customerData)
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
      <div className="relative bg-white dark:bg-dark-2 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-600">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {t.customer.createNew}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Alert */}
          {errors.general && (
            <div className="mb-4 p-3 bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400 rounded-lg text-sm">
              {errors.general}
            </div>
          )}

          {/* Personal Information */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t.customer.personalInformation}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.customer.firstName} *
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
                      : "border-neutral-300 dark:border-neutral-600 focus:ring-primary-500"
                  } rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2`}
                  placeholder="John"
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    {errors.first_name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.customer.lastName} *
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
                      : "border-neutral-300 dark:border-neutral-600 focus:ring-primary-500"
                  } rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2`}
                  placeholder="Doe"
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    {errors.last_name}
                  </p>
                )}
              </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t.customer.nameCyrillic}
                <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
                  (Auto-generated)
                </span>
              </label>
              <input
                type="text"
                value={formData.name_cyrillic}
                onChange={(e) => {
                  isManualCyrillicEdit.current = true
                  setFormData((prev) => ({
                    ...prev,
                    name_cyrillic: e.target.value,
                  }))
                }}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Автоматически генерируется из First Name"
              />
            </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {t.customer.contactInformation}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
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
                      : "border-neutral-300 dark:border-neutral-600 focus:ring-primary-500"
                  } rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2`}
                  placeholder="+998901234567"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-danger-600 dark:text-danger-400">
                    {errors.phone}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.customer.dateOfBirth}
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date_of_birth: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t.customer.location}
            </h3>
            <GeoSelect
              value={formData.geo}
              onChange={(geo) => setFormData((prev) => ({ ...prev, geo }))}
            />
          </div>

          {/* Additional Information */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t.customer.additionalInformation}
            </h3>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                {t.common.name === "Name" ? "Notes" : t.common.name}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-dark-3 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Any special notes about the customer..."
              />
            </div>
          </div>

          {/* Passport Photo Upload */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Documents
            </h3>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Passport Photo
              </label>
              <ImageUpload
                value={formData.passport_photo_path}
                onChange={(path) =>
                  setFormData((prev) => ({
                    ...prev,
                    passport_photo_path: path,
                  }))
                }
                label={t.forms.uploadPassport}
              />
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                Accepted formats: JPG, JPEG, PNG, WEBP (max 5MB)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-600">
            <button
              type="button"
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})
