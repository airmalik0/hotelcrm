import { updateCustomer } from "@/api/customers"
import type {
  CustomerPublic,
  CustomerUpdate,
  District,
} from "@/client/types.gen"
import { ImageUpload } from "@/components/ui/ImageUpload"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { handleFormError, showSuccess } from "@/utils/error-handling"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Camera } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

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

interface CustomerEditFormProps {
  customer: CustomerPublic
}

export function CustomerEditForm({ customer }: CustomerEditFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<CustomerUpdate>({
    first_name: customer.first_name || "",
    last_name: customer.last_name || "",
    phone: customer.phone || "",
    date_of_birth: customer.date_of_birth
      ? new Date(customer.date_of_birth).toISOString().split("T")[0]
      : "",
    district: customer.district || undefined,
    passport_photo_path: customer.passport_photo_path || undefined,
    notes: customer.notes || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateMutation = useMutation({
    mutationFn: (data: CustomerUpdate) => updateCustomer(customer.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customer.id] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      showSuccess("Customer updated successfully!")
    },
    onError: (error) => {
      handleFormError(error, (validationErrors) => setErrors(validationErrors), "Failed to update customer")
    },
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field
    if (errors[name as keyof CustomerUpdate]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (formData.first_name && !formData.first_name.trim()) {
      newErrors.first_name = "First name cannot be empty"
    } else if (formData.first_name && formData.first_name.trim().length > 100) {
      newErrors.first_name = "First name must be 100 characters or less"
    }
    if (formData.last_name && !formData.last_name.trim()) {
      newErrors.last_name = "Last name cannot be empty"
    } else if (formData.last_name && formData.last_name.trim().length > 100) {
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      const submitData: CustomerUpdate = {
        first_name: formData.first_name || undefined,
        last_name: formData.last_name || undefined,
        phone: formData.phone || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        district: formData.district as District | undefined,
        passport_photo_path: formData.passport_photo_path || undefined,
        notes: formData.notes || undefined,
      }
      updateMutation.mutate(submitData)
    }
  }

  const handleDistrictChange = (value: string | null) => {
    setFormData((prev) => ({
      ...prev,
      district: value as District | null,
    }))
    // Clear error for district field
    if (errors.district) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        newErrors.district = undefined
        return newErrors
      })
    }
  }

  const handleCancel = () => {
    navigate("/customers")
  }

  return (
    <div>
      <h5 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
        Edit Customer Profile
      </h5>

      {/* Passport Photo */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
          Passport Photo
        </label>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-600/25 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {customer.first_name[0]}
              {customer.last_name[0]}
            </span>
          </div>
          <div>
            <ImageUpload
              value={formData.passport_photo_path}
              onChange={(path) =>
                setFormData((prev) => ({ ...prev, passport_photo_path: path }))
              }
              label="Upload Passport"
            />
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Accepted formats: JPG, JPEG, PNG, WEBP (max 5MB)
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
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
              value={formData.first_name || ""}
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
              value={formData.last_name || ""}
              onChange={handleInputChange}
              className={`border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none ${
                errors.last_name ? "border-danger-600" : ""
              }`}
              placeholder="Enter last name"
            />
            {errors.last_name && (
              <p className="text-danger-600 text-sm mt-1">{errors.last_name}</p>
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
              value={formData.phone || ""}
              onChange={handleInputChange}
              className={`border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none ${
                errors.phone ? "border-danger-600" : ""
              }`}
              placeholder="Enter phone number"
            />
            {errors.phone && (
              <p className="text-danger-600 text-sm mt-1">{errors.phone}</p>
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
              value={formData.date_of_birth || ""}
              onChange={handleInputChange}
              className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none"
            />
          </div>

          {/* District */}
          <div className="sm:col-span-2">
            <SearchableSelect
              label="District"
              value={formData.district || ""}
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
              value={formData.notes || ""}
              onChange={handleInputChange}
              rows={4}
              className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none resize-none"
              placeholder="Add any notes about the customer..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="border border-danger-600 text-danger-600 hover:bg-danger-100 dark:hover:bg-danger-600/25 text-base px-14 py-2.5 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-75 disabled:cursor-not-allowed text-base px-14 py-2.5 rounded-lg flex items-center gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
