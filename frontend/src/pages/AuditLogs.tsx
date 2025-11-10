import { getAuditLogs } from "@/api/audit"
import type { AuditLogPublic } from "@/client/types.gen"
import { AuditLogDetails } from "@/components/audit/AuditLogDetails"
import { AuditStats } from "@/components/audit/AuditStats"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatDateTime } from "@/utils/formatters"
import { useQuery } from "@tanstack/react-query"
import { Eye, Filter, Search, Shield } from "lucide-react"
import type React from "react"
import { useState } from "react"

// Action type badges with colors
const getActionBadgeColor = (action: string) => {
  if (action.includes("created") || action === "registered")
    return "bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400"
  if (action.includes("updated") || action.includes("modified"))
    return "bg-info-100 dark:bg-info-600/30 text-info-600 dark:text-info-400"
  if (action.includes("deleted") || action === "self_deleted")
    return "bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400"
  if (action === "logged_in")
    return "bg-primary-100 dark:bg-primary-600/30 text-primary-600 dark:text-primary-400"
  if (
    action.includes("checked_in") ||
    action.includes("checked_out") ||
    action === "executed"
  )
    return "bg-warning-100 dark:bg-warning-600/30 text-warning-600 dark:text-warning-400"
  return "bg-neutral-100 dark:bg-neutral-600/30 text-neutral-600 dark:text-neutral-400"
}

export function AuditLogs() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAction, setFilterAction] = useState<string>("")
  const [filterEntityType, setFilterEntityType] = useState<string>("")
  const [filterUsername, setFilterUsername] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [selectedLog, setSelectedLog] = useState<AuditLogPublic | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch audit logs
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "audit-logs",
      currentPage,
      itemsPerPage,
      searchTerm,
      filterAction,
      filterEntityType,
      filterUsername,
    ],
    queryFn: () =>
      getAuditLogs({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        action: filterAction || undefined,
        entity_type: filterEntityType || undefined,
        user_name: filterUsername || undefined,
      }),
  })

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCurrentPage(0)
  }

  const totalPages = data ? Math.ceil(data.count / itemsPerPage) : 0

  // Extract unique values for filters
  const uniqueActions = data
    ? [...new Set(data.data.map((log) => log.action))].sort()
    : []
  const uniqueEntityTypes = data
    ? [...new Set(data.data.map((log) => log.entity_type))].sort()
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.pages.audit.title}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {t.pages.audit.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      {/* Stats */}
      <AuditStats />

      {/* Main Table */}
      <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="border-b border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-6 py-4">
          <div className="flex items-center flex-wrap gap-3 justify-between mb-3">
            <div className="flex items-center flex-wrap gap-3">
              <span className="text-base font-medium text-neutral-600 dark:text-neutral-400 mb-0">
                {t.pages.audit.show}
              </span>
              <select
                className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white ps-3 pe-5 py-1.5 text-sm w-auto focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(0)
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  className="bg-white dark:bg-neutral-700 h-10 w-64 pl-10 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                  placeholder={t.pages.audit.searchLogs}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              </form>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-lg px-4 py-2.5 inline-flex items-center gap-2 transition text-sm font-medium shadow-sm ${
                showFilters
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-600"
              }`}
            >
              <Filter className="w-4 h-4" />
              {t.pages.audit.filters}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">
                  {t.audit.action}
                </label>
                <select
                  className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={filterAction}
                  onChange={(e) => {
                    setFilterAction(e.target.value)
                    setCurrentPage(0)
                  }}
                >
                  <option value="">{t.audit.allActions}</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">
                  {t.audit.entityType}
                </label>
                <select
                  className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={filterEntityType}
                  onChange={(e) => {
                    setFilterEntityType(e.target.value)
                    setCurrentPage(0)
                  }}
                >
                  <option value="">{t.audit.allEntityTypes}</option>
                  {uniqueEntityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1 block">
                  {t.audit.username}
                </label>
                <input
                  type="text"
                  className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white px-3 py-2 text-sm w-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t.audit.filterByUsername}
                  value={filterUsername}
                  onChange={(e) => {
                    setFilterUsername(e.target.value)
                    setCurrentPage(0)
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max rounded-lg border-spacing-0 border-separate border border-neutral-200 dark:border-neutral-600">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-600">
                  <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                    {t.pages.audit.timestamp}
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                    {t.pages.audit.user}
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                    Action
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                    Entity Type
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                    Description
                  </th>
                  <th className="text-center py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-neutral-500"
                    >
                      Loading audit logs...
                    </td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-danger-600"
                    >
                      Error loading audit logs
                    </td>
                  </tr>
                )}
                {data?.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-neutral-500"
                    >
                      {t.common.noAuditLogsFound}
                    </td>
                  </tr>
                )}
                {data?.data.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300 text-sm">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-base font-medium text-neutral-900 dark:text-white">
                        {log.username}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300 capitalize">
                      {log.entity_type}
                    </td>
                    <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300 max-w-md truncate">
                      {log.description}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2 justify-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="w-8 h-8 bg-info-100 dark:bg-info-600/30 hover:bg-info-200 text-info-600 dark:text-info-400 rounded-full inline-flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Showing {currentPage * itemsPerPage + 1} to{" "}
                {Math.min((currentPage + 1) * itemsPerPage, data?.count || 0)}{" "}
                of {data?.count || 0} entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="px-3 py-1 rounded border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = currentPage - 2 + i
                  if (page < 0 || page >= totalPages) return null
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded ${
                        currentPage === page
                          ? "bg-primary-600 text-white"
                          : "border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      }`}
                    >
                      {page + 1}
                    </button>
                  )
                }).filter(Boolean)}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1 rounded border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AuditLogDetails
        auditLog={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
