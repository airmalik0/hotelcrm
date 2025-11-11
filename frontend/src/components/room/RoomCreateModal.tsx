import { createRoom, getRoomCategories } from "@/api/rooms"
import type {
  RoomCategoriesPublic,
  RoomCategoryPublic,
  RoomCreate,
  RoomStatus,
} from "@/client/types.gen"
import { useLanguage } from "@/contexts/LanguageContext"
import { handleFormError, showSuccess } from "@/utils/error-handling"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"

interface RoomCreateModalProps {
  onClose: () => void
}

export function RoomCreateModal({ onClose }: RoomCreateModalProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<RoomCreate>({
    room_number: "",
    floor: 1,
    price_per_night: 100,
    status: "available",
    description: "",
    category_id: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Fetch categories
  const { data: categoriesData } = useQuery<RoomCategoriesPublic>({
    queryKey: ["room-categories"],
    queryFn: () => getRoomCategories({ limit: 100 }),
  })

  const categories: RoomCategoryPublic[] = useMemo(
    () => categoriesData?.data || [],
    [categoriesData?.data],
  )

  const createMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      showSuccess(t.room.roomCreatedSuccess)
      onClose()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        t.room.failedToCreateRoom,
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validate
    const newErrors: Record<string, string> = {}
    if (!formData.room_number.trim()) {
      newErrors.room_number = t.room.roomNumberRequired
    } else if (formData.room_number.trim().length > 10) {
      newErrors.room_number = t.room.roomNumberMaxLength
    } else if (
      !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(formData.room_number.trim())
    ) {
      newErrors.room_number = t.room.roomNumberFormat
    }
    if (formData.floor < 1) {
      newErrors.floor = t.room.floorMinValue
    } else if (formData.floor > 20) {
      newErrors.floor = t.room.floorMaxValue
    }
    if (formData.price_per_night <= 0) {
      newErrors.price_per_night = t.room.priceGreaterThanZero
    } else if (formData.price_per_night > 100000) {
      newErrors.price_per_night = t.room.priceMaxValue
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    createMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-dark-2 shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t.room.addNewRoom}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <X className="w-5 h-5 text-neutral-400 hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-300" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {errors.general && (
                <div className="bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400 px-4 py-3 rounded-lg text-sm">
                  {errors.general}
                </div>
              )}

              {/* Room Number */}
              <div>
                <label
                  htmlFor="room_number"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {t.room.roomNumberRequired}
                </label>
                <input
                  type="text"
                  id="room_number"
                  value={formData.room_number}
                  onChange={(e) =>
                    setFormData({ ...formData, room_number: e.target.value })
                  }
                  className={`w-full border ${
                    errors.room_number
                      ? "border-danger-500 dark:border-danger-400"
                      : "border-neutral-300 dark:border-neutral-500"
                  } rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors`}
                  placeholder={t.bookingDetails.roomNumberExample}
                />
                {errors.room_number && (
                  <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                    {errors.room_number}
                  </p>
                )}
              </div>

              {/* Floor */}
              <div>
                <label
                  htmlFor="floor"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {t.room.floorRequired}
                </label>
                <input
                  type="number"
                  id="floor"
                  value={formData.floor}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: Number(e.target.value) })
                  }
                  className={`w-full border ${
                    errors.floor
                      ? "border-danger-500 dark:border-danger-400"
                      : "border-neutral-300 dark:border-neutral-500"
                  } rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors`}
                  min="0"
                />
                {errors.floor && (
                  <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                    {errors.floor}
                  </p>
                )}
              </div>

              {/* Room Type removed */}

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="category_id"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    {t.room.categoryLabel}
                  </label>
                </div>
                <select
                  id="category_id"
                  value={formData.category_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category_id: e.target.value ? e.target.value : null,
                    })
                  }
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                >
                  <option value="">{t.room.noCategory}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price per Night */}
              <div>
                <label
                  htmlFor="price_per_night"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {t.room.pricePerNightRequired}
                </label>
                <input
                  type="number"
                  id="price_per_night"
                  value={formData.price_per_night}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_per_night: Number(e.target.value),
                    })
                  }
                  className={`w-full border ${
                    errors.price_per_night
                      ? "border-danger-500 dark:border-danger-400"
                      : "border-neutral-300 dark:border-neutral-500"
                  } rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors`}
                  min="0"
                  step="0.01"
                />
                {errors.price_per_night && (
                  <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                    {errors.price_per_night}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {t.room.initialStatus}
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as RoomStatus,
                    })
                  }
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                >
                  <option value="available">{t.room.statusAvailable}</option>
                  <option value="occupied">{t.room.statusOccupied}</option>
                  <option value="cleaning">{t.room.statusCleaning}</option>
                  <option value="maintenance">
                    {t.room.statusMaintenance}
                  </option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  {t.room.categoryDescription}
                </label>
                <textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                  placeholder={t.room.optionalDescription}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-200 dark:border-neutral-600 px-6 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                {t.booking.cancel}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {createMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {t.room.createRoom}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
