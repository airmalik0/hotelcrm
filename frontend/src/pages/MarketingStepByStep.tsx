// Step by step testing to find React error #130 source
import { getCampaigns } from "@/api/campaigns"
import type { CampaignStatus, CampaignType } from "@/client/types.gen"
import { formatDate } from "@/utils/formatters"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle, Mail, MessageSquare, Zap } from "lucide-react"
import { useState } from "react"

export function MarketingStepByStep() {
  const [currentPage] = useState(0)
  const [itemsPerPage] = useState(10)

  // Fetch campaigns
  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns", currentPage, itemsPerPage],
    queryFn: () =>
      getCampaigns({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
      }),
  })

  // STEP 1: Test helper functions individually
  const getStatusBadge = (status: CampaignStatus) => {
    console.log("getStatusBadge called with:", status, typeof status)

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

    const result = (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-red-100 text-red-800"}`}
      >
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
      </span>
    )

    console.log("getStatusBadge returning:", result)
    return result
  }

  const getTypeBadge = (type: CampaignType) => {
    console.log("getTypeBadge called with:", type, typeof type)

    const isOnetime = type === "onetime"
    const result = (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isOnetime
            ? "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
            : "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200"
        }`}
      >
        {isOnetime ? <Mail className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
        {isOnetime ? "One-time" : "Trigger"}
      </span>
    )

    console.log("getTypeBadge returning:", result)
    return result
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
  console.log("About to render campaigns:", campaigns)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Step by Step Test
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Testing each component individually
          </p>
        </div>
      </div>

      {/* STEP 2: Test individual helper functions */}
      {campaigns.length > 0 && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <h2 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
            Helper Functions Test
          </h2>
          <div className="space-y-2">
            <div>Status Badge: {getStatusBadge(campaigns[0].status)}</div>
            <div>Type Badge: {getTypeBadge(campaigns[0].type)}</div>
            <div>Format Date: {formatDate(campaigns[0].updated_at)}</div>
          </div>
        </div>
      )}

      {/* STEP 3: Test simple table without complex rendering */}
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
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-600">
                {campaigns.map((campaign) => {
                  console.log(
                    "Rendering campaign in map:",
                    campaign.id,
                    campaign.name,
                  )

                  return (
                    <tr
                      key={campaign.id}
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
                      <td className="px-6 py-4">
                        {console.log(
                          "About to render type badge for:",
                          campaign.type,
                        )}
                        {getTypeBadge(campaign.type)}
                      </td>
                      <td className="px-6 py-4">
                        {console.log(
                          "About to render status badge for:",
                          campaign.status,
                        )}
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {console.log(
                          "About to render date for:",
                          campaign.updated_at,
                        )}
                        {formatDate(campaign.updated_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
