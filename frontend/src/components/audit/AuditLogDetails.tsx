import type { AuditLogPublic } from "@/client/types.gen"
import { formatDateTime } from "@/utils/formatters"
import { X } from "lucide-react"
import { useEffect } from "react"

interface AuditLogDetailsProps {
  auditLog: AuditLogPublic | null
  isOpen: boolean
  onClose: () => void
}

export function AuditLogDetails({
  auditLog,
  isOpen,
  onClose,
}: AuditLogDetailsProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen || !auditLog) return null

  const hasChanges = auditLog.old_values || auditLog.new_values

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-2 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
              Audit Log Details
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 inline-flex items-center justify-center text-neutral-500 dark:text-neutral-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  User
                </label>
                <p className="mt-1 text-base text-neutral-900 dark:text-white">
                  {auditLog.username}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Timestamp
                </label>
                <p className="mt-1 text-base text-neutral-900 dark:text-white">
                  {formatDateTime(auditLog.timestamp)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Action
                </label>
                <p className="mt-1">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-600/30 text-primary-600 dark:text-primary-400">
                    {auditLog.action}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Entity Type
                </label>
                <p className="mt-1 text-base text-neutral-900 dark:text-white">
                  {auditLog.entity_type}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Entity
                </label>
                <p className="mt-1 text-base text-neutral-900 dark:text-white">
                  {auditLog.entity_name}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Description
                </label>
                <p className="mt-1 text-base text-neutral-900 dark:text-white">
                  {auditLog.description}
                </p>
              </div>
            </div>

            {/* Changes */}
            {hasChanges && (
              <div className="border-t border-neutral-200 dark:border-neutral-600 pt-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                  Changes
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Old Values */}
                  {auditLog.old_values && (
                    <div>
                      <label className="text-sm font-medium text-danger-600 dark:text-danger-400 mb-2 block">
                        Old Values
                      </label>
                      <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-600">
                        <pre className="text-sm text-neutral-900 dark:text-white font-mono overflow-x-auto whitespace-pre-wrap break-words">
                          {JSON.stringify(auditLog.old_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* New Values */}
                  {auditLog.new_values && (
                    <div>
                      <label className="text-sm font-medium text-success-600 dark:text-success-400 mb-2 block">
                        New Values
                      </label>
                      <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-600">
                        <pre className="text-sm text-neutral-900 dark:text-white font-mono overflow-x-auto whitespace-pre-wrap break-words">
                          {JSON.stringify(auditLog.new_values, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Technical Details */}
            <div className="border-t border-neutral-200 dark:border-neutral-600 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Technical Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Audit Log ID
                  </label>
                  <p className="mt-1 text-sm text-neutral-900 dark:text-white font-mono">
                    {auditLog.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Entity ID
                  </label>
                  <p className="mt-1 text-sm text-neutral-900 dark:text-white font-mono">
                    {auditLog.entity_id}
                  </p>
                </div>
                {auditLog.user_id && (
                  <div>
                    <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      User ID
                    </label>
                    <p className="mt-1 text-sm text-neutral-900 dark:text-white font-mono">
                      {auditLog.user_id}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-neutral-200 dark:border-neutral-600 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2.5 inline-flex items-center gap-2 transition bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
