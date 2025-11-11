import type { RoomPublic } from "@/client/types.gen"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoomStatusColor } from "@/utils/booking-colors"
import { formatRoomName } from "@/utils/booking-grid"
import { formatCurrency } from "@/utils/formatters"
import clsx from "clsx"
import { Bed, DollarSign } from "lucide-react"
import { memo } from "react"

interface RoomCellProps {
  room: RoomPublic
  height?: number
}

export const RoomCell = memo(function RoomCell({
  room,
  height = 64,
}: RoomCellProps) {
  const { currency, t } = useLanguage()
  return (
    <div
      className={clsx(
        "relative",
        "sticky left-0 z-30",
        "bg-white dark:bg-dark-2",
        "border-b border-r border-neutral-200 dark:border-neutral-700",
        "w-[200px]",
      )}
      style={{
        height: `${height}px`,
      }}
    >
      <div className="h-full px-3 py-2 flex flex-col justify-center gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
            {formatRoomName(room)}
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-600/30 text-neutral-700 dark:text-neutral-400">
            {room.category?.name || t.booking.uncategorized}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
            <span className="font-medium text-neutral-700 dark:text-neutral-200">
              {formatCurrency(room.price_per_night, currency)}
            </span>
          </div>
          {room.max_occupancy && room.max_occupancy > 0 && (
            <div className="flex items-center gap-1">
              <Bed className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
              <span className="text-neutral-600 dark:text-neutral-300">
                {room.max_occupancy}
              </span>
            </div>
          )}
        </div>
      </div>

      <div
        className={clsx(
          "absolute top-2 right-3",
          "text-[10px] px-1.5 py-0.5 rounded",
          getRoomStatusColor(room.status),
        )}
      >
        {room.status?.replace("_", " ") || "Unknown"}
      </div>
    </div>
  )
})
