import type { RoomPublic, RoomStatus } from "@/client/types.gen"
import { useRole } from "@/hooks/useRole"
import { formatCurrency } from "@/utils/formatters"
import { Building2, Edit, Eye, Trash2 } from "lucide-react"
import type React from "react"

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

// Get status display text
function getStatusText(status: RoomStatus): string {
  switch (status) {
    case "available":
      return "Available"
    case "occupied":
      return "Occupied"
    case "cleaning":
      return "Cleaning"
    case "maintenance":
      return "Maintenance"
    default:
      return status
  }
}

// Get room type badge classes
function getRoomTypeBadgeClasses(type: string): string {
  switch (type) {
    case "vip":
      return "text-primary-600 bg-primary-100 dark:bg-primary-600/30 dark:text-primary-400"
    case "standard":
      return "text-neutral-600 bg-neutral-100 dark:bg-neutral-600/30 dark:text-neutral-400"
    default:
      return "text-neutral-600 bg-neutral-100 dark:bg-neutral-600/30 dark:text-neutral-400"
  }
}

export function RoomCard({ room, onView, onEdit, onDelete }: RoomCardProps) {
  const { hasAnyRole } = useRole()
  const canEdit = hasAnyRole(["admin", "manager"])

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
          {/* Room Type Badge */}
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full uppercase ${getRoomTypeBadgeClasses(
              room.room_type,
            )}`}
          >
            {room.room_type}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-6 py-5">
        {/* Status Badge */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClasses(
              room.status || "available",
            )}`}
          >
            {getStatusText(room.status || "available")}
          </span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
            Price per night
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatCurrency(room.price_per_night)}
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
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => onEdit(room)}
                className="w-8 h-8 bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400 rounded-full inline-flex items-center justify-center hover:bg-success-200 dark:hover:bg-success-600/40 transition-colors"
                title="Edit Room"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(room)}
                className="w-8 h-8 bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400 rounded-full inline-flex items-center justify-center hover:bg-danger-200 dark:hover:bg-danger-600/40 transition-colors"
                title="Delete Room"
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
