import { AlertTriangle, CheckCircle, Info, X } from "lucide-react"
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
      Icon: AlertTriangle,
    },
    warning: {
      iconBg: "bg-orange-100 dark:bg-orange-600/25",
      iconColor: "text-orange-600 dark:text-orange-400",
      confirmBtn: "bg-orange-600 hover:bg-orange-700 text-white",
      Icon: AlertTriangle,
    },
    info: {
      iconBg: "bg-blue-100 dark:bg-blue-600/25",
      iconColor: "text-blue-600 dark:text-blue-400",
      confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white",
      Icon: Info,
    },
    primary: {
      iconBg: "bg-primary-100 dark:bg-primary-600/25",
      iconColor: "text-primary-600 dark:text-primary-400",
      confirmBtn: "bg-primary-600 hover:bg-primary-700 text-white",
      Icon: Info,
    },
    success: {
      iconBg: "bg-emerald-100 dark:bg-emerald-600/25",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
      Icon: CheckCircle,
    },
  }

  const styles = variantStyles[variant]
  const IconComponent = styles.Icon

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
          <IconComponent className={`w-6 h-6 ${styles.iconColor}`} />
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            {title}
          </h3>
          <div className="text-neutral-600 dark:text-neutral-400">
            {typeof message === "string"
              ? // Handle string messages with newlines
                message
                  .split("\n")
                  .map((line, index) => (
                    <div key={index} className={line === "" ? "h-2" : ""}>
                      {line}
                    </div>
                  ))
              : // Handle JSX/ReactNode messages
                message}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBtn}`}
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
