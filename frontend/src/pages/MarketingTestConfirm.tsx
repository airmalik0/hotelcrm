// Test ConfirmDialog specifically to find React error #130 source
import { getCampaigns } from "@/api/campaigns"
import { useConfirm } from "@/hooks/useConfirm"
import { useQuery } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { useState } from "react"

export function MarketingTestConfirm() {
  const [currentPage] = useState(0)
  const [itemsPerPage] = useState(10)

  console.log("MarketingTestConfirm: Calling useConfirm hook...")

  // Test useConfirm hook
  const { confirm, ConfirmDialog } = useConfirm()

  console.log("MarketingTestConfirm: useConfirm result:", {
    confirm,
    ConfirmDialog,
    confirmType: typeof confirm,
    ConfirmDialogType: typeof ConfirmDialog,
  })

  // Test basic query (this works)
  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns", currentPage, itemsPerPage],
    queryFn: () =>
      getCampaigns({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
      }),
  })

  console.log("MarketingTestConfirm: About to render with ConfirmDialog")

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
        </div>
      </div>
    )
  }

  const campaigns = data?.data || []

  const handleTestConfirm = async () => {
    console.log("Testing confirm function...")
    try {
      const result = await confirm({
        title: "Test Confirmation",
        message: "This is a test confirmation dialog",
        confirmText: "OK",
        variant: "info",
      })
      console.log("Confirm result:", result)
    } catch (error) {
      console.error("Confirm error:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Test Confirm
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Testing useConfirm hook and ConfirmDialog
          </p>
        </div>
        <button
          type="button"
          onClick={handleTestConfirm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Test Confirm
        </button>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <div className="space-y-4">
          <div>
            <strong>Campaigns loaded:</strong> {campaigns.length}
          </div>
          <div>
            <strong>Confirm function available:</strong>{" "}
            {confirm ? "Yes" : "No"}
          </div>
          <div>
            <strong>ConfirmDialog component available:</strong>{" "}
            {ConfirmDialog ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {console.log("About to render ConfirmDialog:", ConfirmDialog)}

      {/* This is the suspected source of React error #130 */}
      {ConfirmDialog}

      {console.log("ConfirmDialog rendered successfully")}
    </div>
  )
}
