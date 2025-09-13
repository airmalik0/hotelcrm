import type { RoomPublic, RoomStatus } from "@/client/types.gen"
import { Bed, Crown, Home } from "lucide-react"
import type React from "react"

interface RoomSidebarProps {
  rooms: RoomPublic[]
}

export function RoomSidebar({ rooms }: RoomSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-neutral-50 dark:bg-dark-3">
      {/* Header */}
      <div className="h-12 px-3 flex items-center border-b border-neutral-200 dark:border-neutral-600 bg-white dark:bg-dark-2">
        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Rooms ({rooms.length})
        </span>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {rooms.map((room, index) => (
          <RoomRow key={room.id} room={room} isEven={index % 2 === 0} />
        ))}
      </div>
    </div>
  )
}

interface RoomRowProps {
  room: RoomPublic
  isEven: boolean
}

function RoomRow({ room, isEven }: RoomRowProps) {
  const getStatusColor = (status?: RoomStatus): string => {
    const colors: Record<RoomStatus, string> = {
      available: "bg-green-500 dark:bg-green-400",
      occupied: "bg-red-500 dark:bg-red-400",
      cleaning: "bg-yellow-500 dark:bg-yellow-400",
      maintenance: "bg-purple-500 dark:bg-purple-400",
    }
    return status ? colors[status] : colors.available
  }

  return (
    <div
      className={`
        h-[60px] px-3 flex items-center border-b border-neutral-200 dark:border-neutral-600
        ${
          isEven
            ? "bg-white dark:bg-dark-2"
            : "bg-neutral-50/50 dark:bg-dark-3/50"
        }
        hover:bg-neutral-100 dark:hover:bg-dark-3 transition-colors
      `}
      data-room-id={room.id}
    >
      <div className="flex items-center justify-between w-full">
        {/* Room Info */}
        <div className="flex items-center gap-2.5">
          {/* Room Type Icon */}
          {room.room_type === "vip" ? (
            <Crown className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <Bed className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          )}

          {/* Room Number */}
          <div>
            <div className="text-sm font-medium text-neutral-900 dark:text-white">
              {room.room_number}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              F{room.floor}
            </div>
          </div>
        </div>

        {/* Status Dot */}
        <div
          className={`w-2 h-2 rounded-full ${getStatusColor(room.status)}`}
          title={room.status}
        />
      </div>
    </div>
  )
}
