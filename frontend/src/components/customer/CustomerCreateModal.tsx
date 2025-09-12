import { createCustomer } from "@/api/customers"
import type { CustomerCreate, District } from "@/client/types.gen"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { useMutation } from "@tanstack/react-query"
import { X } from "lucide-react"
import type React from "react"
import { useState } from "react"

// District options from the enum
const DISTRICT_OPTIONS: Array<{ value: District; label: string }> = [
  { value: "Almazar", label: "Almazar" },
  { value: "Bektemir", label: "Bektemir" },
  { value: "Mirabad", label: "Mirabad" },
  { value: "Mirzo Ulugbek", label: "Mirzo Ulugbek" },
  { value: "Sergeli", label: "Sergeli" },
  { value: "Uchtepa", label: "Uchtepa" },
  { value: "Chilanzar", label: "Chilanzar" },
  { value: "Shaykhantakhur", label: "Shaykhantakhur" },
  { value: "Yunusabad", label: "Yunusabad" },
  { value: "Yakkasaray", label: "Yakkasaray" },
  { value: "Yashnabad", label: "Yashnabad" },
  { value: "Yangihayot", label: "Yangihayot" },
]

interface CustomerCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CustomerCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: CustomerCreateModalProps) {
  const [formData, setFormData] = useState<CustomerCreate>({
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    district: null,
    notes: "",
  })

  const [errors, setErrors] = useState<Partial<CustomerCreate>>({})

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      onSuccess()
      resetForm()
    },
    onError: (error: any) => {
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === "string") {
          setErrors({ first_name: error.response.data.detail })
        }
      }
    },
  })

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      phone: "",
      date_of_birth: "",
      district: null,
      notes: "",
    })
    setErrors({})
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field
    if (errors[name as keyof CustomerCreate]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerCreate> = {}

    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required"
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required"
    }
    if (formData.phone) {
      const digitsOnly = formData.phone.replace(/\D/g, "")
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        newErrors.phone = "Phone number must contain between 7 and 15 digits"
      }
    }
    if (formData.date_of_birth) {
      const birthDate = new Date(formData.date_of_birth)
      const now = new Date()

      // Check if date is in the future
      if (birthDate > now) {
        newErrors.date_of_birth = "Date of birth cannot be in the future"
      }
      // Check if year is before 1900
      else if (birthDate.getFullYear() < 1900) {
        newErrors.date_of_birth = "Date of birth must be after year 1900"
      }
      // Check if age is over 150
      else {
        const age =
          (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        if (age > 150) {
          newErrors.date_of_birth = "Invalid date of birth (age over 150 years)"
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      const submitData: CustomerCreate = {
        ...formData,
        date_of_birth: formData.date_of_birth || undefined,
        phone: formData.phone || undefined,
        district: formData.district as District | undefined,
        notes: formData.notes || undefined,
      }
      createMutation.mutate(submitData)
    }
  }

  const handleDistrictChange = (value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      district: value as District | null,
    }))
    // Clear error for district field
    if (errors.district) {
      setErrors((prev) => ({
        ...prev,
        district: undefined,
      }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-600">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Add New Customer
            </h3>
            <button
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label
                    htmlFor="first_name"
                    className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
                  >
                    First Name <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={`border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none ${
                      errors.first_name ? "border-danger-600" : ""
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.first_name && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.first_name}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label
                    htmlFor="last_name"
                    className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
                  >
                    Last Name <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={`border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none ${
                      errors.last_name ? "border-danger-600" : ""
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.last_name && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.last_name}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none ${
                      errors.phone ? "border-danger-600" : ""
                    }`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label
                    htmlFor="date_of_birth"
                    className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
                  >
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    className={`border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none ${
                      errors.date_of_birth ? "border-danger-600" : ""
                    }`}
                  />
                  {errors.date_of_birth && (
                    <p className="text-danger-600 text-sm mt-1">
                      {errors.date_of_birth}
                    </p>
                  )}
                </div>

                {/* District */}
                <div className="sm:col-span-2">
                  <SearchableSelect
                    label="District"
                    value={formData.district}
                    onChange={handleDistrictChange}
                    options={DISTRICT_OPTIONS}
                    placeholder="Select a district"
                    error={errors.district}
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="notes"
                    className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
                  >
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none resize-none"
                    placeholder="Add any notes about the customer..."
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-600">
              <button
                type="button"
                onClick={onClose}
                className="border border-danger-600 text-danger-600 hover:bg-danger-100 dark:hover:bg-danger-600/25 text-base px-6 py-2.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-75 disabled:cursor-not-allowed text-base px-6 py-2.5 rounded-lg flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Customer"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
