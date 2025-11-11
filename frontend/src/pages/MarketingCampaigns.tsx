// Working version - replaced entire file to fix React error #130
import {
  deleteCampaign,
  executeCampaign,
  getCampaigns,
  previewCampaignRecipients,
} from "@/api/campaigns"
import type {
  CampaignPublic,
  CampaignStatus,
  CampaignType,
} from "@/client/types.gen"
import { CampaignFormModal } from "@/components/campaigns/CampaignFormModal"
import { useLanguage } from "@/contexts/LanguageContext"
import { useConfirm } from "@/hooks/useConfirm"
import { showError, showSuccess } from "@/utils/error-handling"
import { formatDate } from "@/utils/formatters"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  Edit2,
  Eye,
  Mail,
  Play,
  Plus,
  Search,
  Trash2,
  Users,
  Zap,
} from "lucide-react"
// React import not needed directly
import { useState } from "react"

type StatusFilter = "all" | CampaignStatus
type TypeFilter = "all" | CampaignType

export function MarketingCampaigns() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignPublic | null>(null)
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  // Fetch campaigns
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "campaigns",
      currentPage,
      itemsPerPage,
      searchTerm,
      statusFilter,
      typeFilter,
    ],
    queryFn: () =>
      getCampaigns({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        campaign_type: typeFilter !== "all" ? typeFilter : undefined,
      }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      showSuccess(t.marketingActions.campaignDeletedSuccess)
    },
    onError: (error) => {
      showError(error, t.marketingActions.failedToDeleteCampaign)
    },
  })

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: ({ id, testMode }: { id: string; testMode: boolean }) =>
      executeCampaign(id, { test_mode: testMode }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      if (result.test_mode) {
        showSuccess(
          `Test execution completed! ${result.sms_sent} SMS would be sent to ${result.customers_matched} customers.`,
        )
      } else {
        showSuccess(
          `Campaign executed! ${result.sms_sent} SMS sent to ${result.customers_matched} customers.`,
        )
      }
    },
    onError: (error) => {
      showError(error, t.marketingActions.failedToExecuteCampaign)
    },
  })

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: previewCampaignRecipients,
    onError: (error) => {
      showError(error, t.marketingActions.failedToPreviewRecipients)
    },
  })

  const handleDelete = async (campaign: CampaignPublic) => {
    const confirmed = await confirm({
      title: t.marketing.deleteCampaign,
      message: t.marketing.deleteCampaignConfirm.replace("{name}", campaign.name),
      confirmText: t.common.delete,
      variant: "danger",
    })

    if (confirmed) {
      deleteMutation.mutate(campaign.id)
    }
  }

  const handleExecute = async (campaign: CampaignPublic, testMode = false) => {
    const actionText = testMode ? "test" : "execute"
    const confirmed = await confirm({
      title: testMode ? t.marketing.testCampaign : t.marketing.executeCampaign,
      message: `Are you sure you want to ${actionText} "${campaign.name}"?${testMode ? " This will be a test run with mock SMS." : " This will send real SMS messages."}`,
      confirmText: testMode ? t.marketing.testRun : t.marketing.execute,
      variant: testMode ? "info" : "danger",
    })

    if (confirmed) {
      executeMutation.mutate({ id: campaign.id, testMode })
    }
  }

  const handlePreview = async (campaign: CampaignPublic) => {
    try {
      const preview = await previewMutation.mutateAsync(campaign.id)

      await confirm({
        title: t.marketing.campaignRecipientsPreview,
        message: `Campaign "${campaign.name}" would target ${preview.total_matching_customers} customers. Preview shows first ${preview.preview_customers.length} customers.`,
        confirmText: "OK",
      })
    } catch (error) {
      // Error already handled by mutation
    }
  }

  const handleCreateCampaign = () => {
    setSelectedCampaign(null)
    setIsFormModalOpen(true)
  }

  const handleEditCampaign = (campaign: CampaignPublic) => {
    setSelectedCampaign(campaign)
    setIsFormModalOpen(true)
  }

  const handleModalClose = () => {
    setIsFormModalOpen(false)
    setSelectedCampaign(null)
  }

  const handleModalSuccess = () => {
    // Refetch campaigns after successful create/update
    queryClient.invalidateQueries({ queryKey: ["campaigns"] })
  }

  const getStatusBadge = (status?: CampaignStatus) => {
    if (!status) {
      console.log("[getStatusBadge] returning null badge")
      return <span className="text-neutral-400">-</span>
    }

    const styles = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      active:
        "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200",
      paused:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200",
      completed:
        "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
      archived: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getTypeBadge = (type: CampaignType) => {
    const isOnetime = type === "onetime"
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isOnetime
            ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
            : "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200"
        }`}
      >
        {isOnetime ? <Mail className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
        {isOnetime ? t.marketing.onetime : t.marketing.trigger}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-600 dark:text-neutral-400">
          Loading campaigns...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-red-600 dark:text-red-400">
            Failed to load campaigns
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Please try refreshing the page
          </div>
        </div>
      </div>
    )
  }

  const campaigns = data?.data || []
  const totalCount = data?.count || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.pages.marketing.title}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {t.pages.marketing.description}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateCampaign}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-2"
        >
          <Plus className="w-4 h-4" />
          {t.pages.marketing.newCampaign}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder={t.bookingDetails.searchCampaignsPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-white"
          >
            <option value="all">{t.marketing.allStatuses}</option>
            <option value="draft">{t.marketing.draft}</option>
            <option value="active">{t.marketing.active}</option>
            <option value="paused">{t.marketing.paused}</option>
            <option value="completed">{t.marketing.completed}</option>
            <option value="archived">{t.marketing.archived}</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-white"
          >
            <option value="all">{t.marketing.allTypes}</option>
            <option value="onetime">{t.marketing.onetime}</option>
            <option value="trigger">{t.marketing.trigger}</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              {t.common.noCampaignsFound}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                ? t.common.tryAdjustingFilters
                : t.common.createFirstCampaign}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Statistics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-600">
                {campaigns.map((campaign) => (
                  <tr
                    key={String(campaign.id)}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-neutral-900 dark:text-white">
                          {campaign.name}
                        </div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                          {campaign.message_template}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getTypeBadge(campaign.type)}</td>
                    <td className="px-6 py-4">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-neutral-900 dark:text-white">
                        <div>Sent: {campaign.total_sent ?? 0}</div>
                        <div>Delivered: {campaign.total_delivered ?? 0}</div>
                        {(campaign.total_failed ?? 0) > 0 && (
                          <div className="text-red-600 dark:text-red-400">
                            Failed: {campaign.total_failed}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                      {formatDate(campaign.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePreview(campaign)}
                          className="p-2 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400"
                          title={t.marketing.previewRecipients}
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        {campaign.type === "onetime" &&
                          campaign.status !== "completed" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleExecute(campaign, true)}
                                className="p-2 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400"
                                title={t.marketing.testRunTitle}
                                disabled={executeMutation.isPending}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExecute(campaign, false)}
                                className="p-2 text-neutral-400 hover:text-green-600 dark:hover:text-green-400"
                                title={t.marketing.executeCampaignTitle}
                                disabled={executeMutation.isPending}
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        <button
                          type="button"
                          onClick={() => handleEditCampaign(campaign)}
                          className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                          title={t.marketing.editCampaignTitle}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(campaign)}
                          className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                          title={t.marketing.deleteCampaign}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between bg-white dark:bg-dark-2 px-6 py-3 border border-neutral-200 dark:border-neutral-600 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {t.pages.marketing.show}
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(0)
              }}
              className="border border-neutral-300 dark:border-neutral-500 rounded bg-white dark:bg-transparent text-neutral-900 dark:text-white px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {t.pages.marketing.ofCampaigns.replace(
                "{count}",
                String(totalCount),
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-500 rounded text-neutral-700 dark:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              {t.pages.marketing.previous}
            </button>
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              {t.pages.marketing.page
                .replace("{current}", String(currentPage + 1))
                .replace(
                  "{total}",
                  String(Math.ceil(totalCount / itemsPerPage)),
                )}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  Math.min(
                    Math.ceil(totalCount / itemsPerPage) - 1,
                    currentPage + 1,
                  ),
                )
              }
              disabled={currentPage >= Math.ceil(totalCount / itemsPerPage) - 1}
              className="px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-500 rounded text-neutral-700 dark:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              {t.pages.marketing.next}
            </button>
          </div>
        </div>
      )}

      {ConfirmDialog}

      {/* Campaign Form Modal */}
      <CampaignFormModal
        isOpen={isFormModalOpen}
        onClose={handleModalClose}
        campaign={selectedCampaign}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
