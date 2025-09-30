// Fixed version of MarketingCampaigns with detailed error checking

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
import { showError, showSuccess } from "@/utils/error-handling"
import { formatDate } from "@/utils/formatters"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  Edit2,
  Eye,
  Mail,
  MessageSquare,
  Play,
  Plus,
  Search,
  Trash2,
  Users,
  Zap,
} from "lucide-react"
import type React from "react"
import { useState } from "react"

// Import CampaignFormModal with fallback
let CampaignFormModal: React.ComponentType<any>
try {
  CampaignFormModal =
    require("@/components/campaigns/CampaignFormModal").CampaignFormModal
  console.log("CampaignFormModal loaded successfully:", CampaignFormModal)
} catch (error) {
  console.error("Failed to import CampaignFormModal:", error)
  CampaignFormModal = () => <div>CampaignFormModal import error</div>
}

// Import useConfirm with fallback
let useConfirm: any
let ConfirmDialog: React.ComponentType<any>
try {
  const confirmHook = require("@/hooks/useConfirm")
  useConfirm = confirmHook.useConfirm
  console.log("useConfirm loaded successfully:", useConfirm)
} catch (error) {
  console.error("Failed to import useConfirm:", error)
  useConfirm = () => ({
    confirm: async () => true,
    ConfirmDialog: () => <div>ConfirmDialog import error</div>,
  })
}

type StatusFilter = "all" | CampaignStatus
type TypeFilter = "all" | CampaignType

export function MarketingCampaignsFixed() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignPublic | null>(null)
  const queryClient = useQueryClient()

  // Use the imported hook
  const { confirm, ConfirmDialog: ImportedConfirmDialog } = useConfirm()

  console.log("MarketingCampaignsFixed rendering, components:", {
    CampaignFormModal,
    useConfirm,
    ImportedConfirmDialog,
  })

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
      showSuccess("Campaign deleted successfully!")
    },
    onError: (error) => {
      showError(error, "Failed to delete campaign. Please try again.")
    },
  })

  const handleCreateCampaign = () => {
    setSelectedCampaign(null)
    setIsFormModalOpen(true)
  }

  const handleModalClose = () => {
    setIsFormModalOpen(false)
    setSelectedCampaign(null)
  }

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["campaigns"] })
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
            Marketing Campaigns (Fixed)
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Create and manage SMS marketing campaigns
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateCampaign}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-dark-2"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Campaigns List */}
      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No campaigns found
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Create your first marketing campaign to get started
            </p>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-neutral-600 dark:text-neutral-400">
              Found {campaigns.length} campaigns (total: {totalCount})
            </p>
          </div>
        )}
      </div>

      {ImportedConfirmDialog && <ImportedConfirmDialog />}

      {/* Campaign Form Modal */}
      {CampaignFormModal && (
        <CampaignFormModal
          isOpen={isFormModalOpen}
          onClose={handleModalClose}
          campaign={selectedCampaign}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}
