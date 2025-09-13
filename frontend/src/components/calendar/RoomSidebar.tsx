import type { RoomPublic, RoomStatus } from "@/client/types.gen"
import { Bed, Crown, Home } from "lucide-react"
import type React from "react"

interface RoomSidebarProps {
  rooms: RoomPublic[]
}

export function RoomSidebar({ rooms }: RoomSidebarProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-neutral-200 dark:border-neutral-600">
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          Rooms ({rooms.length})
        </span>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {rooms.map((room) => (
          <RoomRow key={room.id} room={room} />
        ))}
      </div>
    </div>
  )
}

interface RoomRowProps {
  room: RoomPublic
}

function RoomRow({ room }: RoomRowProps) {
  const getStatusColor = (status?: RoomStatus): string => {
    const colors: Record<RoomStatus, string> = {
      available: "bg-green-500",
      occupied: "bg-red-500",
      cleaning: "bg-yellow-500",
      maintenance: "bg-purple-500"
    }
    return status ? colors[status] : colors.available
  }

  const getStatusLabel = (status?: RoomStatus): string => {
    const labels: Record<RoomStatus, string> = {
      available: "Available",
      occupied: "Occupied",
      cleaning: "Cleaning",
      maintenance: "Maintenance"
    }
    return status ? labels[status] : labels.available
  }

  return (
    <div
      className="h-[60px] px-4 flex items-center border-b border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-dark-3 transition-colors"
      data-room-id={room.id}
    >
      <div className="flex items-center justify-between w-full">
        {/* Room Info */}
        <div className="flex items-center gap-3">
          {/* Room Type Icon */}
          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
            {room.room_type === "vip" ? (
              <Crown className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <Bed className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            )}
          </div>

          {/* Room Number & Floor */}
          <div>
            <div className="text-sm font-semibold text-neutral-900 dark:text-white">
              Room {room.room_number}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Floor {room.floor}
              {room.room_type === "vip" && (
                <span className="ml-1 text-yellow-600 dark:text-yellow-400">
                  • VIP
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${getStatusColor(room.status)}`}
            title={getStatusLabel(room.status)}
          />
        </div>
      </div>
    </div>
  )
}