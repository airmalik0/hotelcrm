import { BarChart3 } from "lucide-react"

export function Analytics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Revenue insights, occupancy metrics, and customer demographics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      {/* Description Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Advanced Analytics Features
            </h3>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              Comprehensive analytics with breakdowns by rooms and time periods:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Revenue tracking with room and period details
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Average guest age with demographic insights
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Occupancy rates across time intervals
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Payment method distribution percentages
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Geographic distribution by districts
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                Interactive charts with filtering capabilities
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="text-center py-12 bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Analytics Dashboard Coming Soon
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          Comprehensive analytics with revenue tracking, demographic insights,
          and interactive charts will be implemented in the next development
          phase.
        </p>
      </div>
    </div>
  )
}
