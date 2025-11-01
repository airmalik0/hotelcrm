import { updateCustomer } from "@/api/customers"
import type {
  CustomerPublic,
  CustomerSource,
  CustomerUpdate,
  District,
} from "@/client/types.gen"
import { GeoSelect, type GeoValue } from "@/components/ui/GeoSelect"
import { TagsInput } from "@/components/ui/TagsInput"
import { useLanguage } from "@/contexts/LanguageContext"
import { safeParseDate } from "@/utils/date-helpers"
import { handleFormError, showSuccess } from "@/utils/error-handling"
import { generateCyrillicName } from "@/utils/transliteration"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

// Legacy district-only options removed; use GeoSelect

// Available customer tags from backend enum
const CUSTOMER_TAGS: Array<{ value: string; label: string }> = [
  { value: "loyal", label: "Loyal" },
  { value: "vip", label: "VIP" },
  { value: "problematic", label: "Problematic" },
]

interface CustomerEditFormProps {
  customer: CustomerPublic
}

export function CustomerEditForm({ customer }: CustomerEditFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const [formData, setFormData] = useState<CustomerUpdate>({
    first_name: customer.first_name || "",
    last_name: customer.last_name || "",
    name_cyrillic: (customer as any).name_cyrillic || "",
    phone: customer.phone || "",
    date_of_birth: customer.date_of_birth
      ? safeParseDate(customer.date_of_birth).toISOString().split("T")[0]
      : "",
    country_code:
      customer.country_code || (customer.district ? "UZ" : undefined),
    region:
      customer.region || (customer.district ? "TASHKENT_CITY" : undefined),
    district: customer.district || undefined,
    notes: customer.notes || "",
    tags: customer.tags || [],
    source: customer.source || undefined,
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

  const updateMutation = useMutation({
    mutationFn: (data: CustomerUpdate) => updateCustomer(customer.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", customer.id] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      showSuccess(t.customer.customerUpdatedSuccess)
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        t.customer.failedToUpdate,
      )
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
      newErrors.first_name = t.customer.firstNameCannotBeEmpty
    } else if (formData.first_name && formData.first_name.trim().length > 100) {
      newErrors.first_name = t.customer.firstNameMaxLength
    }
    if (formData.last_name && !formData.last_name.trim()) {
      newErrors.last_name = t.customer.lastNameCannotBeEmpty
    } else if (formData.last_name && formData.last_name.trim().length > 100) {
      newErrors.last_name = t.customer.lastNameMaxLength
    }
    if (formData.phone) {
      const digitsOnly = formData.phone.replace(/\D/g, "")
      if (
        digitsOnly.length > 0 &&
        (digitsOnly.length < 7 || digitsOnly.length > 15)
      ) {
        newErrors.phone = t.customer.phoneInvalid
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
        name_cyrillic: formData.name_cyrillic || undefined,
        phone: formData.phone || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        // Important: send nulls to explicitly clear values when user removed them
        country_code: formData.country_code ?? null,
        region: formData.region ?? null,
        district: (formData.district as District | null) ?? null,
        notes: formData.notes || undefined,
        tags: formData.tags || undefined,
        source: formData.source ?? null,
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

  const handleTagsChange = (tags: string[]) => {
    setFormData((prev) => ({
      ...prev,
      tags,
    }))
  }

  const handleCancel = () => {
    navigate("/customers")
  }

  return (
    <div>
      <h5 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
        {t.customer.editProfile}
      </h5>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label
              htmlFor="first_name"
              className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
            >
              {t.customer.firstName} <span className="text-danger-600">*</span>
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
              placeholder={t.customer.enterFirstName}
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
              {t.customer.lastName} <span className="text-danger-600">*</span>
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
              placeholder={t.customer.enterLastName}
            />
            {errors.last_name && (
              <p className="text-danger-600 text-sm mt-1">{errors.last_name}</p>
            )}
          </div>

          {/* Name (Cyrillic) */}
          <div>
            <label
              htmlFor="name_cyrillic"
              className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
            >
              {t.customer.nameCyrillic}
              <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2 font-normal">
                {t.customer.autoGenerated}
              </span>
            </label>
            <input
              type="text"
              id="name_cyrillic"
              name="name_cyrillic"
              value={(formData as any).name_cyrillic || ""}
              onChange={(e) => {
                isManualCyrillicEdit.current = true
                handleInputChange(e)
              }}
              className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none"
              placeholder={t.customer.cyrillicNamePlaceholder}
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
            >
              {t.customer.phoneNumber}
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
              placeholder={t.customer.enterPhoneNumber}
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
              {t.customer.dateOfBirth}
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

          {/* Location */}
          <div className="sm:col-span-2">
            <GeoSelect
              label={t.customer.location}
              value={{
                country_code: formData.country_code || null,
                region: formData.region || null,
                district: (formData.district as string | null) || null,
              }}
              onChange={(geo) => {
                setFormData((prev) => ({
                  ...prev,
                  // Keep undefined for untouched, but allow nulls for clearing
                  country_code: geo.country_code,
                  region: geo.region,
                  district: geo.district as District | null,
                }))
                // Clear field error linkage if any
                if (errors.district || errors.region || errors.country_code) {
                  setErrors((prev) => ({
                    ...prev,
                    district: undefined,
                    region: undefined,
                    country_code: undefined,
                  }))
                }
              }}
            />
          </div>

          {/* Tags */}
          <div className="sm:col-span-2">
            <TagsInput
              label={t.analytics.tags}
              value={formData.tags || []}
              onChange={handleTagsChange}
              availableTags={CUSTOMER_TAGS}
              placeholder={t.customer.selectCustomerTags}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Source */}
          <div>
            <label
              htmlFor="source"
              className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
            >
              {t.customer.source}
            </label>
            <select
              id="source"
              name="source"
              value={formData.source || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  source: (e.target.value as CustomerSource) || undefined,
                }))
              }
              className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-300 focus:outline-none"
            >
              <option value="">{t.customer.sourcePlaceholder}</option>
              <option value="WALK_IN">{t.customer.sourceWalkIn}</option>
              <option value="INSTAGRAM">{t.customer.sourceInstagram}</option>
              <option value="OLX">{t.customer.sourceOlx}</option>
            </select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label
              htmlFor="notes"
              className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2"
            >
              {t.customer.notes}
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes || ""}
              onChange={handleInputChange}
              rows={4}
              className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-primary-300 focus:outline-none resize-none"
              placeholder={t.customer.addNotesAboutCustomer}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="border border-danger-600 text-danger-600 hover:bg-danger-100 dark:hover:bg-danger-600/30 text-base px-14 py-2.5 rounded-lg"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-75 disabled:cursor-not-allowed text-base px-14 py-2.5 rounded-lg flex items-center gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t.forms.saving}
              </>
            ) : (
              t.forms.saveChanges
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
