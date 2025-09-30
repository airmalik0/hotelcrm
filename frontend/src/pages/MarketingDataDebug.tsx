// Debug campaigns data to find React error #130 cause
import { getCampaigns } from "@/api/campaigns"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { useState } from "react"

export function MarketingDataDebug() {
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

  console.log("Raw API data:", data)

  if (data?.data) {
    console.log("Campaigns array:", data.data)
    data.data.forEach((campaign, index) => {
      console.log(`Campaign ${index}:`, campaign)
      console.log(`Campaign ${index} keys:`, Object.keys(campaign))
      console.log(`Campaign ${index} values:`, Object.values(campaign))

      // Check each field type
      Object.entries(campaign).forEach(([key, value]) => {
        console.log(`  ${key}:`, typeof value, value)
      })
    })
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Data Debug
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Debug campaigns data structure
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <div className="space-y-4">
          <div>
            <strong>Total campaigns:</strong> {campaigns.length} (total:{" "}
            {totalCount})
          </div>

          {campaigns.length > 0 && (
            <div>
              <strong>
                First campaign data (check console for full details):
              </strong>
              <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-auto">
                {JSON.stringify(campaigns[0], null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Try to render a simple campaign item without components */}
      {campaigns.length > 0 && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <h2 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
            Simple Campaign Render Test
          </h2>
          <div className="space-y-2">
            <div>
              <strong>Name:</strong> {String(campaigns[0].name)}
            </div>
            <div>
              <strong>Type:</strong> {String(campaigns[0].type)}
            </div>
            <div>
              <strong>Status:</strong> {String(campaigns[0].status)}
            </div>
            <div>
              <strong>Message:</strong> {String(campaigns[0].message_template)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
