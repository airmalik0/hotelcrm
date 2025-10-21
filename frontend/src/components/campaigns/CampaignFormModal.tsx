import { createCampaign, updateCampaign } from "@/api/campaigns"
import type {
  CampaignCreate,
  CampaignPublic,
  CampaignStatus,
  CampaignType,
  CampaignUpdate,
  District,
} from "@/client/types.gen"
import { handleFormError, showSuccess } from "@/utils/error-handling"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  MapPin,
  MessageSquare,
  Save,
  Users,
  X,
  Zap,
} from "lucide-react"
import { useEffect, useState } from "react"

interface CampaignFormModalProps {
  isOpen: boolean
  onClose: () => void
  campaign?: CampaignPublic | null
  onSuccess?: () => void
}

const DISTRICTS: District[] = [
  "ALMAZAR",
  "BEKTEMIR",
  "MIRABAD",
  "MIRZO_ULUGBEK",
  "SERGELI",
  "UCHTEPA",
  "CHILANZAR",
  "SHAYKHANTAKHUR",
  "YUNUSABAD",
  "YAKKASARAY",
  "YASHNABAD",
  "YANGIHAYOT",
]

// Legacy ROOM_TYPES removed

const formatDistrictDisplay = (district: string): string => {
  return district
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

export function CampaignFormModal({
  isOpen,
  onClose,
  campaign,
  onSuccess,
}: CampaignFormModalProps) {
  const queryClient = useQueryClient()
  const isEditMode = !!campaign

  // Form state
  const [formData, setFormData] = useState<{
    name: string
    type: CampaignType
    status: CampaignStatus
    message_template: string
    trigger_frequency_minutes?: number
  }>({
    name: "",
    type: "onetime",
    status: "draft",
    message_template: "",
    trigger_frequency_minutes: undefined,
  })

  // Criteria state
  const [criteria, setCriteria] = useState<{
    min_age?: number
    max_age?: number
    districts?: District[]
    min_total_spent?: number
    days_since_last_visit?: number
    // visited_room_types removed
  }>({})

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showCriteriaEditor, setShowCriteriaEditor] = useState(false)

  // Initialize form with campaign data when editing
  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        message_template: campaign.message_template,
        trigger_frequency_minutes:
          campaign.trigger_frequency_minutes || undefined,
      })
      setCriteria((campaign.criteria as any) || {})
      setShowCriteriaEditor(Object.keys(campaign.criteria || {}).length > 0)
    } else {
      // Reset for create mode
      setFormData({
        name: "",
        type: "onetime",
        status: "draft",
        message_template: "",
        trigger_frequency_minutes: undefined,
      })
      setCriteria({})
      setShowCriteriaEditor(false)
    }
  }, [campaign])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CampaignCreate) => createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      showSuccess("Campaign created successfully!")
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        "Failed to create campaign",
      )
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CampaignUpdate }) =>
      updateCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      showSuccess("Campaign updated successfully!")
      onSuccess?.()
      onClose()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        "Failed to update campaign",
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.message_template.trim()) {
      newErrors.message_template = "Message template is required"
    }

    if (formData.message_template.trim().length < 10) {
      newErrors.message_template =
        "Message template must be at least 10 characters"
    }

    if (formData.type === "trigger" && !formData.trigger_frequency_minutes) {
      newErrors.trigger_frequency_minutes =
        "Frequency is required for trigger campaigns"
    }

    if (
      criteria.min_age &&
      criteria.max_age &&
      criteria.min_age > criteria.max_age
    ) {
      newErrors.age = "Minimum age cannot be greater than maximum age"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Clean up empty criteria values
    const cleanedCriteria = Object.entries(criteria).reduce(
      (acc, [key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          (!Array.isArray(value) || value.length > 0)
        ) {
          acc[key] = value
        }
        return acc
      },
      {} as any,
    )

    const payload = {
      ...formData,
      criteria: cleanedCriteria,
      trigger_frequency_minutes:
        formData.type === "trigger"
          ? formData.trigger_frequency_minutes
          : undefined,
    }

    if (isEditMode && campaign) {
      updateMutation.mutate({
        id: campaign.id,
        data: payload as CampaignUpdate,
      })
    } else {
      createMutation.mutate(payload as CampaignCreate)
    }
  }

  const handleCriteriaChange = (field: string, value: any) => {
    setCriteria((prev) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
        const { [field]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [field]: value }
    })
  }

  const handleDistrictToggle = (district: District) => {
    setCriteria((prev) => {
      const currentDistricts = prev.districts || []
      const newDistricts = currentDistricts.includes(district)
        ? currentDistricts.filter((d) => d !== district)
        : [...currentDistricts, district]

      return newDistricts.length > 0
        ? { ...prev, districts: newDistricts }
        : { ...prev, districts: undefined }
    })
  }

  if (!isOpen) return null

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-white dark:bg-dark-2 rounded-lg shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-2 border-b border-neutral-200 dark:border-neutral-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {isEditMode ? "Edit Campaign" : "Create Campaign"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Basic Information
            </h3>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Summer Sale Campaign"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Campaign Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as CampaignType,
                      trigger_frequency_minutes:
                        e.target.value === "trigger" ? 30 : undefined,
                    }))
                  }
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isEditMode}
                >
                  <option value="onetime">One-time</option>
                  <option value="trigger">Trigger (Automated)</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as CampaignStatus,
                    }))
                  }
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  {isEditMode && (
                    <>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Trigger Frequency */}
            {formData.type === "trigger" && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Check Frequency (minutes) *
                </label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  <input
                    type="number"
                    value={formData.trigger_frequency_minutes || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        trigger_frequency_minutes: e.target.value
                          ? Number.parseInt(e.target.value)
                          : undefined,
                      }))
                    }
                    min={5}
                    max={1440}
                    className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="30"
                  />
                  <span className="text-sm text-neutral-500">
                    min: 5, max: 1440 (24h)
                  </span>
                </div>
                {errors.trigger_frequency_minutes && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.trigger_frequency_minutes}
                  </p>
                )}
                <p className="text-sm text-neutral-500 mt-1">
                  Campaign will check for new matching customers every{" "}
                  {formData.trigger_frequency_minutes || 30} minutes
                </p>
              </div>
            )}

            {/* Message Template */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Message Template *
              </label>
              <textarea
                value={formData.message_template}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    message_template: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Hello {first_name}! We have a special offer for you..."
                rows={4}
                maxLength={1000}
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-neutral-500">
                  Available variables: {"{first_name}"}, {"{last_name}"},{" "}
                  {"{full_name}"}
                </p>
                <p className="text-xs text-neutral-500">
                  {formData.message_template.length}/1000
                </p>
              </div>
              {errors.message_template && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.message_template}
                </p>
              )}
            </div>
          </div>

          {/* Customer Criteria */}
          <div className="space-y-4">
            <div className="flex items-center justify_between">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Customer Criteria
              </h3>
              <button
                type="button"
                onClick={() => setShowCriteriaEditor(!showCriteriaEditor)}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {showCriteriaEditor ? "Hide Criteria" : "Add Criteria"}
              </button>
            </div>

            {showCriteriaEditor && (
              <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                {/* Age Range */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Age Range
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        value={criteria.min_age || ""}
                        onChange={(e) =>
                          handleCriteriaChange(
                            "min_age",
                            e.target.value
                              ? Number.parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        min={0}
                        max={120}
                        className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white text-sm"
                        placeholder="Min age"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={criteria.max_age || ""}
                        onChange={(e) =>
                          handleCriteriaChange(
                            "max_age",
                            e.target.value
                              ? Number.parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        min={0}
                        max={120}
                        className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white text-sm"
                        placeholder="Max age"
                      />
                    </div>
                  </div>
                  {errors.age && (
                    <p className="text-red-500 text-sm mt-1">{errors.age}</p>
                  )}
                </div>

                {/* Districts */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Districts
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DISTRICTS.map((district) => (
                      <label
                        key={district}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            criteria.districts?.includes(district) || false
                          }
                          onChange={() => handleDistrictToggle(district)}
                          className="rounded border-neutral-300 dark:border-neutral-500"
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {formatDistrictDisplay(district)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Spending and Visit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Minimum Total Spent
                    </label>
                    <input
                      type="number"
                      value={criteria.min_total_spent || ""}
                      onChange={(e) =>
                        handleCriteriaChange(
                          "min_total_spent",
                          e.target.value
                            ? Number.parseFloat(e.target.value)
                            : undefined,
                        )
                      }
                      min={0}
                      className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white text-sm"
                      placeholder="e.g., 500000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Days Since Last Visit
                    </label>
                    <input
                      type="number"
                      value={criteria.days_since_last_visit || ""}
                      onChange={(e) =>
                        handleCriteriaChange(
                          "days_since_last_visit",
                          e.target.value
                            ? Number.parseInt(e.target.value)
                            : undefined,
                        )
                      }
                      min={0}
                      className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white text-sm"
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>

                {/* Room types criteria removed */}

                {/* Criteria Summary */}
                {Object.keys(criteria).length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Active Filters
                        </p>
                        <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-0.5">
                          {criteria.min_age && (
                            <li>• Minimum age: {criteria.min_age}</li>
                          )}
                          {criteria.max_age && (
                            <li>• Maximum age: {criteria.max_age}</li>
                          )}
                          {criteria.districts &&
                            criteria.districts.length > 0 && (
                              <li>
                                • Districts:{" "}
                                {criteria.districts
                                  .map((d) => formatDistrictDisplay(d))
                                  .join(", ")}
                              </li>
                            )}
                          {criteria.min_total_spent && (
                            <li>
                              • Minimum spent:{" "}
                              {criteria.min_total_spent.toLocaleString()}
                            </li>
                          )}
                          {criteria.days_since_last_visit && (
                            <li>
                              • Not visited for:{" "}
                              {criteria.days_since_last_visit} days
                            </li>
                          )}
                          {/* Room types summary removed */}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-600">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text_white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditMode ? "Update Campaign" : "Create Campaign"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
