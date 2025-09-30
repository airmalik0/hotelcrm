// Debug version - Step 2: Add TanStack Query
import { getCampaigns } from "@/api/campaigns"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { useState } from "react"

export function MarketingDebugQuery() {
  const [currentPage] = useState(0)
  const [itemsPerPage] = useState(10)

  console.log("MarketingDebugQuery: Starting component with TanStack Query...")

  // Test TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns", currentPage, itemsPerPage],
    queryFn: () =>
      getCampaigns({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
      }),
  })

  console.log("MarketingDebugQuery: Query result:", { data, isLoading, error })

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
    console.error("MarketingDebugQuery: Error occurred:", error)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-red-600 dark:text-red-400">
            Failed to load campaigns
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
            Error: {error.message}
          </div>
        </div>
      </div>
    )
  }

  const campaigns = data?.data || []
  console.log("MarketingDebugQuery: Campaigns data:", campaigns)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Debug Query
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Testing TanStack Query - Step 2
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <div className="space-y-4">
          <div>
            <strong>Query Status:</strong>{" "}
            {isLoading ? "Loading" : error ? "Error" : "Success"}
          </div>
          <div>
            <strong>Campaigns loaded:</strong> {campaigns.length}
          </div>
          <div>
            <strong>Data structure:</strong> {JSON.stringify(data, null, 2)}
          </div>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          <h3 className="text-lg font-medium mb-4">First Campaign Data:</h3>
          <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
            {JSON.stringify(campaigns[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
