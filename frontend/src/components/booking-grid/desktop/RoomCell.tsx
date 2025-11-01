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
        "relative", // For absolute positioning of status badge
        "sticky left-0 z-30",
        "bg-white dark:bg-dark-2",
        "border-b border-r border-neutral-200 dark:border-neutral-700",
        "w-[200px]", // Fixed width to match grid column
      )}
      style={{
        height: `${height}px`,
      }}
    >
      <div className="h-full px-3 flex items-center">
        <div className="flex items-center gap-2 w-full">
          {/* Room number and type */}
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
            {formatRoomName(room)}
          </h3>
          <span
            className={clsx(
              "text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-600/30 text-neutral-700 dark:text-neutral-400",
            )}
          >
            {room.category?.name || t.booking.uncategorized}
          </span>

          {/* Icons */}
          <div className="flex items-center gap-2 ml-auto text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-0.5">
              <DollarSign className="w-3 h-3" />
              <span>{formatCurrency(room.price_per_night, currency)}</span>
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
        {room.status?.replace("_", " ") || "Unknown"}
      </div>
    </div>
  )
})
