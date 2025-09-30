// Step 2: Add mutations to test React error #130

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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { useState } from "react"

type StatusFilter = "all" | CampaignStatus
type TypeFilter = "all" | CampaignType

export function MarketingDebug2() {
  const [currentPage] = useState(0)
  const [itemsPerPage] = useState(10)
  const [searchTerm] = useState("")
  const [statusFilter] = useState<StatusFilter>("all")
  const [typeFilter] = useState<TypeFilter>("all")
  const queryClient = useQueryClient()

  console.log("MarketingDebug2 rendering...")

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
      showError(error, "Failed to execute campaign. Please try again.")
    },
  })

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: previewCampaignRecipients,
    onError: (error) => {
      showError(error, "Failed to preview recipients. Please try again.")
    },
  })

  console.log("Mutations created:", { deleteMutation, executeMutation, previewMutation })

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Campaigns Debug 2
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Testing with mutations ({campaigns.length} campaigns found)
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <p className="text-neutral-600 dark:text-neutral-400">
          Debug component working with mutations. Query successful.
        </p>
      </div>
    </div>
  )
}