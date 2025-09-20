import type React from "react"

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    label: string
    direction: "up" | "down"
  }
  color?: "cyan" | "purple" | "primary" | "success" | "warning" | "danger"
  loading?: boolean
}

export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  color = "cyan",
  loading = false,
}: KPICardProps) {
  const colorClasses = {
    cyan: "from-cyan-600/30 to-bg-white",
    purple: "from-purple-600/30 to-bg-white",
    primary: "from-primary-600/30 to-bg-white",
    success: "from-success-600/30 to-bg-white",
    warning: "from-warning-600/30 to-bg-white",
    danger: "from-danger-600/30 to-bg-white",
  }

  const iconColorClasses = {
    cyan: "bg-cyan-600",
    purple: "bg-purple-600",
    primary: "bg-primary-600",
    success: "bg-success-600",
    warning: "bg-warning-600",
    danger: "bg-danger-600",
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-2 border border-neutral-200 dark:border-neutral-600 rounded-lg h-full p-5 animate-pulse">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
            <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-24" />
          </div>
          <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-gradient-to-r ${colorClasses[color]} border border-neutral-200 dark:border-neutral-600 rounded-lg h-full`}
    >
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium text-neutral-900 dark:text-white mb-1 text-sm">
              {title}
            </p>
            <h6 className="mb-0 dark:text-white text-2xl font-bold">{value}</h6>
            {trend && (
              <p className="font-medium text-sm text-neutral-600 dark:text-white mt-3 mb-0 flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 ${
                    trend.direction === "up"
                      ? "text-success-600 dark:text-success-400"
                      : "text-danger-600 dark:text-danger-400"
                  }`}
                >
                  {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}
                  %
                </span>
                {trend.label}
              </p>
            )}
          </div>
          <div
            className={`w-12 h-12 ${iconColorClasses[color]} rounded-full flex justify-center items-center`}
          >
            <Icon className="text-white w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
