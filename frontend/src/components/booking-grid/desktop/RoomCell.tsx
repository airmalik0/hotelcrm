import type { RoomPublic } from "@/client/types.gen"
import { getRoomStatusColor, getRoomTypeColor } from "@/utils/booking-colors"
import { formatRoomName } from "@/utils/booking-grid"
import clsx from "clsx"
import { Bed, DollarSign } from "lucide-react"
import { memo } from "react"

interface RoomCellProps {
  room: RoomPublic
}

export const RoomCell = memo(function RoomCell({ room }: RoomCellProps) {
  return (
    <div
      className={clsx(
        "relative", // For absolute positioning of status badge
        "sticky left-0 z-30",
        "bg-white dark:bg-dark-2",
        "border-b border-r border-neutral-200 dark:border-neutral-700",
        "h-16",
        "w-[200px]", // Fixed width to match grid column
      )}
    >
      <div className="h-full px-3 flex items-center">
        <div className="flex items-center gap-2 w-full">
          {/* Room number and type */}
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
            {formatRoomName(room)}
          </h3>
          <span
            className={clsx(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              getRoomTypeColor(room.room_type),
            )}
          >
            {room.room_type}
          </span>

          {/* Icons */}
          <div className="flex items-center gap-2 ml-auto text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-0.5">
              <Bed className="w-3 h-3" />
              <span>{room.capacity}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <DollarSign className="w-3 h-3" />
              <span>{room.price_per_night}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status badge - absolutely positioned */}
      <div
        className={clsx(
          "absolute bottom-1 right-2",
          "text-[10px] px-1.5 py-0.5 rounded",
          getRoomStatusColor(room.status),
        )}
      >
        {room.status.replace("_", " ")}
      </div>
    </div>
  )
})
