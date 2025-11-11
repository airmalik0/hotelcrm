import type { BookingGuestPublic } from "@/client/types.gen"
import { useLanguage } from "@/contexts/LanguageContext"
import { Plus, Users } from "lucide-react"
import { GuestCard } from "./GuestCard"

interface GuestListProps {
  guests: BookingGuestPublic[]
  onAddGuest?: () => void
  onRemoveGuest?: (guestId: string) => void
  removingGuestId?: string | null
  maxOccupancy?: number
  showAddButton?: boolean
  showRemoveButtons?: boolean
}

export function GuestList({
  guests,
  onAddGuest,
  onRemoveGuest,
  removingGuestId = null,
  maxOccupancy,
  showAddButton = true,
  showRemoveButtons = true,
}: GuestListProps) {
  const { t } = useLanguage()
  const canAddMore = maxOccupancy ? guests.length < maxOccupancy : true

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {t.bookingDetails.guestsInRoom}
          </h3>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            ({guests.length}
            {maxOccupancy ? ` / ${maxOccupancy}` : ""})
          </span>
        </div>

        {showAddButton && onAddGuest && canAddMore && (
          <button
            type="button"
            onClick={onAddGuest}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.booking.addGuest}
          </button>
        )}
      </div>

      {/* Guest Cards */}
      {guests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <Users className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mb-3" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
            {t.bookingDetails.noGuestsAdded}
            {showAddButton && onAddGuest && (
              <>
                <br />
                {t.bookingDetails.clickAddGuest}
              </>
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guests.map((guest) => (
            <GuestCard
              key={guest.id}
              guest={guest}
              onRemove={showRemoveButtons ? onRemoveGuest : undefined}
              isRemoving={removingGuestId === guest.id}
              showRemoveButton={showRemoveButtons}
            />
          ))}
        </div>
      )}

      {/* Max Occupancy Warning */}
      {maxOccupancy && guests.length >= maxOccupancy && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-50 dark:bg-warning-600/10 border border-warning-200 dark:border-warning-600/30">
          <div className="flex-shrink-0 mt-0.5">
            <svg
              className="w-5 h-5 text-warning-600 dark:text-warning-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-warning-800 dark:text-warning-300">
              {t.bookingDetails.roomAtMaximumCapacity}
            </p>
            <p className="text-sm text-warning-700 dark:text-warning-400 mt-1">
              {t.bookingDetails.roomAccommodatesGuests
                .replace("{count}", maxOccupancy.toString())
                .replace(
                  "{plural}",
                  maxOccupancy !== 1
                    ? t.language === "ru"
                      ? "ей"
                      : "lar"
                    : t.language === "ru"
                      ? "я"
                      : "",
                )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
