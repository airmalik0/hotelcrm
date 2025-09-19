import { AlertTriangle, X } from "lucide-react"
import type { ReactNode } from "react"

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info" | "primary" | "success"
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      iconBg: "bg-red-100 dark:bg-red-600/25",
      iconColor: "text-red-600 dark:text-red-400",
      confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      iconBg: "bg-yellow-100 dark:bg-yellow-600/25",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      confirmBtn: "bg-yellow-600 hover:bg-yellow-700 text-white",
    },
    info: {
      iconBg: "bg-blue-100 dark:bg-blue-600/25",
      iconColor: "text-blue-600 dark:text-blue-400",
      confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    primary: {
      iconBg: "bg-primary-100 dark:bg-primary-600/25",
      iconColor: "text-primary-600 dark:text-primary-400",
      confirmBtn: "bg-primary-600 hover:bg-primary-700 text-white",
    },
    success: {
      iconBg: "bg-emerald-100 dark:bg-emerald-600/25",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-2 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div
          className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center mb-4`}
        >
          <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {title}
          </h3>
          <div className="text-neutral-600 dark:text-neutral-400">
            {message}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBtn}`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
