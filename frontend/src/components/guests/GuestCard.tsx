import type { BookingGuestPublic } from "@/client/types.gen"
import { getFileUrl } from "@/utils/file-urls"
import { Crown, Mail, MapPin, Phone, Trash2 } from "lucide-react"

interface GuestCardProps {
  guest: BookingGuestPublic
  onRemove?: (guestId: string) => void
  isRemoving?: boolean
  showRemoveButton?: boolean
}

export function GuestCard({
  guest,
  onRemove,
  isRemoving = false,
  showRemoveButton = true,
}: GuestCardProps) {
  const passportUrl = getFileUrl(guest.passport_photo_path)

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Passport Photo */}
        <div className="flex-shrink-0">
          <div className="w-24 h-32 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700">
            {passportUrl ? (
              <img
                src={passportUrl}
                alt={`${guest.full_name || "Guest"} passport`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs text-neutral-400 dark:text-neutral-500">
                  No photo
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Guest Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50 truncate">
                {guest.full_name || "Guest"}
              </h3>
              {guest.is_primary && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-50 dark:bg-warning-600/20 text-warning-600 dark:text-warning-400">
                  <Crown className="w-3 h-3" />
                  <span className="text-xs font-medium">Primary</span>
                </div>
              )}
            </div>

            {showRemoveButton && !guest.is_primary && onRemove && (
              <button
                type="button"
                onClick={() => onRemove(guest.id)}
                disabled={isRemoving}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-600/20 text-neutral-600 dark:text-neutral-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Remove guest"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {/* Origin City */}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
              <span className="text-neutral-700 dark:text-neutral-300 truncate">
                {guest.origin_city}
              </span>
            </div>

            {/* Phone */}
            {guest.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300 truncate">
                  {guest.phone}
                </span>
              </div>
            )}

            {/* Email */}
            {guest.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300 truncate">
                  {guest.email}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
