import { updateRoomStatus } from "@/api/rooms"
import type { RoomPublic, RoomStatus } from "@/client/types.gen"
import { useLanguage } from "@/contexts/LanguageContext"
import { useRole } from "@/hooks/useRole"
import { showError, showSuccess } from "@/utils/error-handling"
import { formatCurrency } from "@/utils/formatters"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Building2, Edit, Eye, Trash2 } from "lucide-react"
import type React from "react"
import { useState } from "react"

interface RoomCardProps {
  room: RoomPublic
  onView: (room: RoomPublic) => void
  onEdit: (room: RoomPublic) => void
  onDelete: (room: RoomPublic) => void
}

// Get status badge classes based on room status
function getStatusBadgeClasses(status: RoomStatus): string {
  switch (status) {
    case "available":
      return "text-success-600 bg-success-100 dark:bg-success-600/30 dark:text-success-400"
    case "occupied":
      return "text-danger-600 bg-danger-100 dark:bg-danger-600/30 dark:text-danger-400"
    case "cleaning":
      return "text-warning-600 bg-warning-100 dark:bg-warning-600/30 dark:text-warning-400"
    case "maintenance":
      return "text-purple-600 bg-purple-100 dark:bg-purple-600/30 dark:text-purple-400"
    default:
      return "text-neutral-600 bg-neutral-100 dark:bg-neutral-600/30 dark:text-neutral-400"
  }
}

// Get status display text - this function should not be used directly, use translations instead
// Keeping for backward compatibility but it's better to use t.room.status* directly
function getStatusText(status: RoomStatus, t?: any): string {
  if (!t) {
    // Fallback if translations not available - use status as-is
    return status
  }
  switch (status) {
    case "available":
      return t.room.statusAvailable
    case "occupied":
      return t.room.statusOccupied
    case "cleaning":
      return t.room.statusCleaning
    case "maintenance":
      return t.room.statusMaintenance
    default:
      return status
  }
}

// Get category badge classes
function getCategoryBadgeClasses(): string {
  return "text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-600/30"
}

export function RoomCard({ room, onView, onEdit, onDelete }: RoomCardProps) {
  const { currency, t } = useLanguage()
  const { hasAnyRole } = useRole()
  const canEdit = hasAnyRole(["admin", "manager"])
  const canFullStatusUpdate = hasAnyRole(["admin", "manager"])
  const isHost = hasAnyRole(["host"])
  const canMarkAvailable = isHost && room.status === "cleaning"
  const queryClient = useQueryClient()
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  const statusMutation = useMutation({
    mutationFn: (newStatus: RoomStatus) => updateRoomStatus(room.id, newStatus),
    onSuccess: () => {
      showSuccess(t.room.roomStatusUpdatedSuccess)
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      setIsChangingStatus(false)
    },
    onError: (error) => {
      showError(error, t.room.failedToUpdateRoomStatus)
    },
  })

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as RoomStatus
    if (newStatus !== room.status) {
      statusMutation.mutate(newStatus)
    }
  }

  const handleMarkAvailable = () => {
    statusMutation.mutate("available")
  }

  return (
    <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 h-full overflow-hidden hover:shadow-lg transition-shadow">
      {/* Card Header with Room Number */}
      <div className="border-b border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-600/30 text-primary-600 dark:text-primary-400 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h6 className="text-lg font-semibold text-neutral-900 dark:text-white mb-0">
                Room {room.room_number}
              </h6>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Floor {room.floor}
              </p>
            </div>
          </div>
          {/* Category Badge */}
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full uppercase ${getCategoryBadgeClasses()}`}
          >
            {room.category?.name || t.booking.uncategorized}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-6 py-5">
        {/* Status Badge or Selector */}
        <div className="mb-4">
          {canFullStatusUpdate ? (
            // Managers and Admins can change to any status
            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-500 dark:text-neutral-400">
                {t.room.statusLabel}
              </label>
              <select
                value={room.status || "available"}
                onChange={handleStatusChange}
                disabled={statusMutation.isPending}
                className={`border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white ps-3 pe-5 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors ${
                  statusMutation.isPending
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <option value="available">{t.room.statusAvailable}</option>
                <option value="occupied">{t.room.statusOccupied}</option>
                <option value="cleaning">{t.room.statusCleaning}</option>
                <option value="maintenance">{t.room.statusMaintenance}</option>
              </select>
            </div>
          ) : canMarkAvailable ? (
            // Hosts can only mark as available after cleaning
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(
                  room.status || "available",
                )}`}
              >
                {getStatusText(room.status || "available", t)}
              </span>
              <button
                onClick={handleMarkAvailable}
                disabled={statusMutation.isPending}
                className={`px-3 py-1 bg-success-50 dark:bg-success-600/30 text-success-600 dark:text-success-400 rounded-lg text-xs font-medium hover:bg-success-100 dark:hover:bg-success-600/40 transition-colors ${
                  statusMutation.isPending
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {t.room.markAsAvailable}
              </button>
            </div>
          ) : (
            // Others just see the status badge
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(
                room.status || "available",
              )}`}
            >
              {getStatusText(room.status || "available", t)}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            {t.room.pricePerNightLabel}
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(room.price_per_night, currency)}
          </p>
        </div>

        {/* Description */}
        {room.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            {room.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-600">
          <button
            onClick={() => onView(room)}
            className="w-8 h-8 bg-primary-50 dark:bg-primary-600/30 text-primary-600 dark:text-primary-400 rounded-full inline-flex items-center justify-center hover:bg-primary-100 dark:hover:bg-primary-600/40 transition-colors"
            title={t.room.viewDetails}
          >
            <Eye className="w-4 h-4" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => onEdit(room)}
                className="w-8 h-8 bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400 rounded-full inline-flex items-center justify-center hover:bg-success-200 dark:hover:bg-success-600/40 transition-colors"
                title={t.room.editRoom}
              >
                <Edit className="w-4 h-4 text-success-600 dark:text-success-400" />
              </button>
              <button
                onClick={() => onDelete(room)}
                className="w-8 h-8 bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400 rounded-full inline-flex items-center justify-center hover:bg-danger-200 dark:hover:bg-danger-600/40 transition-colors"
                title={t.room.deleteRoom}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
