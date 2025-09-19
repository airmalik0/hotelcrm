import { Activity, Shield } from "lucide-react"

export function AuditLogs() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Monitor system activities and user actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      {/* Description Card */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-lg border border-primary-200 dark:border-primary-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Comprehensive Activity Tracking
            </h3>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              The audit logging system will track all critical system activities
              including:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                User authentication & authorization events
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                Booking creation, modification & cancellation
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                Room status changes & maintenance logs
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                Payment processing & financial transactions
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                Customer data access & modifications
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                System configuration & permission changes
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="text-center py-12 bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Audit Logging Coming Soon
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          Advanced audit logging with real-time monitoring, filtering, and
          export capabilities will be available in the next update.
        </p>
      </div>
    </div>
  )
}
