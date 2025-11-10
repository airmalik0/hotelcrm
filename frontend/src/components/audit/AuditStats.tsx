import { getAuditStats } from "@/api/audit"
import { useLanguage } from "@/contexts/LanguageContext"
import { useQuery } from "@tanstack/react-query"
import { Activity, Calendar, FileText, Users } from "lucide-react"

export function AuditStats() {
  const { t } = useLanguage()
  const { data: stats, isLoading } = useQuery({
    queryKey: ["audit-stats"],
    queryFn: getAuditStats,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4 animate-pulse"
          >
            <div className="h-20" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const topActions = Object.entries(stats.actions_by_type)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  const topEntities = Object.entries(stats.actions_by_entity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Actions */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {t.pages.audit.totalActions}
            </p>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-2">
              {stats.total_actions.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {t.pages.audit.lastDays.replace(
                "{days}",
                stats.period_days.toString(),
              )}
            </p>
          </div>
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-600/30 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>

      {/* Top Actions */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {t.pages.audit.topActions}
            </p>
          </div>
          <div className="w-12 h-12 bg-info-100 dark:bg-info-600/30 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-info-600 dark:text-info-400" />
          </div>
        </div>
        <div className="space-y-2">
          {topActions.map(([action, count]) => (
            <div key={action} className="flex items-center justify-between">
              <span className="text-sm text-neutral-900 dark:text-white capitalize">
                {action}
              </span>
              <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Entities */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {t.pages.audit.topEntities}
            </p>
          </div>
          <div className="w-12 h-12 bg-success-100 dark:bg-success-600/30 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-success-600 dark:text-success-400" />
          </div>
        </div>
        <div className="space-y-2">
          {topEntities.map(([entity, count]) => (
            <div key={entity} className="flex items-center justify-between">
              <span className="text-sm text-neutral-900 dark:text-white capitalize">
                {entity}
              </span>
              <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              {t.pages.audit.mostActiveUsers}
            </p>
          </div>
          <div className="w-12 h-12 bg-warning-100 dark:bg-warning-600/30 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-warning-600 dark:text-warning-400" />
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(stats.top_users)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([user, count]) => (
              <div key={user} className="flex items-center justify-between">
                <span className="text-sm text-neutral-900 dark:text-white">
                  {user}
                </span>
                <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                  {count}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
