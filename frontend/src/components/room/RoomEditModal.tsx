import { updateRoom } from "@/api/rooms"
import type {
  RoomPublic,
  RoomStatus,
  RoomType,
  RoomUpdate,
} from "@/client/types.gen"
import { handleFormError, showSuccess } from "@/utils/error-handling"
import { formatDate } from "@/utils/formatters"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import type React from "react"
import { useState } from "react"

interface RoomEditModalProps {
  room: RoomPublic
  onClose: () => void
  viewOnly?: boolean
}

export function RoomEditModal({
  room,
  onClose,
  viewOnly = false,
}: RoomEditModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<RoomUpdate>({
    room_number: room.room_number,
    floor: room.floor,
    room_type: room.room_type,
    price_per_night: room.price_per_night,
    status: room.status,
    description: room.description,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateMutation = useMutation({
    mutationFn: (data: RoomUpdate) => updateRoom(room.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      showSuccess("Room updated successfully!")
      onClose()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        "Failed to update room",
      )
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (viewOnly) return

    setErrors({})

    // Validate
    const newErrors: Record<string, string> = {}
    if (formData.room_number !== null && !formData.room_number?.trim()) {
      newErrors.room_number = "Room number cannot be empty"
    } else if (
      formData.room_number &&
      formData.room_number.trim().length > 10
    ) {
      newErrors.room_number = "Room number must be 10 characters or less"
    } else if (
      formData.room_number &&
      !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(formData.room_number.trim())
    ) {
      newErrors.room_number =
        "Room number must start with letter or number and contain only letters, numbers, and hyphens"
    }
    if (formData.floor !== null && formData.floor < 1) {
      newErrors.floor = "Floor must be 1 or greater"
    } else if (formData.floor !== null && formData.floor > 20) {
      newErrors.floor = "Floor must be 20 or less"
    }
    if (formData.price_per_night !== null && formData.price_per_night <= 0) {
      newErrors.price_per_night = "Price must be greater than 0"
    } else if (
      formData.price_per_night !== null &&
      formData.price_per_night > 100000
    ) {
      newErrors.price_per_night = "Price must be 100,000 or less"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Only send changed fields
    const changedFields: RoomUpdate = {}
    if (formData.room_number !== room.room_number) {
      changedFields.room_number = formData.room_number
    }
    if (formData.floor !== room.floor) {
      changedFields.floor = formData.floor
    }
    if (formData.room_type !== room.room_type) {
      changedFields.room_type = formData.room_type
    }
    if (formData.price_per_night !== room.price_per_night) {
      changedFields.price_per_night = formData.price_per_night
    }
    if (formData.status !== room.status) {
      changedFields.status = formData.status
    }
    if (formData.description !== room.description) {
      changedFields.description = formData.description || null
    }

    if (Object.keys(changedFields).length === 0) {
      onClose()
      return
    }

    updateMutation.mutate(changedFields)
  }

  const modalTitle = viewOnly ? "Room Details" : "Edit Room"

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
              {modalTitle}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300"
            >
              <X className="w-5 h-5" />
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
                  Room Number
                </label>
                <input
                  type="text"
                  id="room_number"
                  value={formData.room_number || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, room_number: e.target.value })
                  }
                  disabled={viewOnly}
                  className={`w-full border ${
                    errors.room_number
                      ? "border-danger-500 dark:border-danger-400"
                      : "border-neutral-300 dark:border-neutral-500"
                  } rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed`}
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
                  Floor
                </label>
                <input
                  type="number"
                  id="floor"
                  value={formData.floor || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: Number(e.target.value) })
                  }
                  disabled={viewOnly}
                  className={`w-full border ${
                    errors.floor
                      ? "border-danger-500 dark:border-danger-400"
                      : "border-neutral-300 dark:border-neutral-500"
                  } rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed`}
                  min="0"
                />
                {errors.floor && (
                  <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                    {errors.floor}
                  </p>
                )}
              </div>

              {/* Room Type */}
              <div>
                <label
                  htmlFor="room_type"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Room Type
                </label>
                <select
                  id="room_type"
                  value={formData.room_type || "standard"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      room_type: e.target.value as RoomType,
                    })
                  }
                  disabled={viewOnly}
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                >
                  <option value="standard">Standard</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              {/* Price per Night */}
              <div>
                <label
                  htmlFor="price_per_night"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Price per Night ($)
                </label>
                <input
                  type="number"
                  id="price_per_night"
                  value={formData.price_per_night || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_per_night: Number(e.target.value),
                    })
                  }
                  disabled={viewOnly}
                  className={`w-full border ${
                    errors.price_per_night
                      ? "border-danger-500 dark:border-danger-400"
                      : "border-neutral-300 dark:border-neutral-500"
                  } rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed`}
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
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status || "available"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as RoomStatus,
                    })
                  }
                  disabled={viewOnly}
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  disabled={viewOnly}
                  rows={3}
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed"
                  placeholder="Optional room description..."
                />
              </div>

              {/* Created Date (View Only) */}
              {viewOnly && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Created
                  </label>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {formatDate(room.created_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-neutral-200 dark:border-neutral-600 px-6 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                {viewOnly ? "Close" : "Cancel"}
              </button>
              {!viewOnly && (
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {updateMutation.isPending && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Save Changes
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
