// Step-by-step recreation of MarketingCampaigns to isolate React error #130

import { getCampaigns } from "@/api/campaigns"
import type {
  CampaignPublic,
  CampaignStatus,
  CampaignType,
} from "@/client/types.gen"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { useState } from "react"

type StatusFilter = "all" | CampaignStatus
type TypeFilter = "all" | CampaignType

export function MarketingDebug() {
  const [currentPage] = useState(0)
  const [itemsPerPage] = useState(10)
  const [searchTerm] = useState("")
  const [statusFilter] = useState<StatusFilter>("all")
  const [typeFilter] = useState<TypeFilter>("all")

  console.log("MarketingDebug rendering...")

  // Basic query - this is the most likely culprit
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

  console.log("Query result:", { data, isLoading, error })

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
            Marketing Campaigns Debug
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Testing step by step ({campaigns.length} campaigns found)
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <p className="text-neutral-600 dark:text-neutral-400">
          Debug component working. Query successful.
        </p>
      </div>
    </div>
  )
}
