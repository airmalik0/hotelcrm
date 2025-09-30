// Debug version - Step 3: Add useConfirm and CampaignFormModal
import { getCampaigns } from "@/api/campaigns"
import { CampaignFormModal } from "@/components/campaigns/CampaignFormModal"
import { useConfirm } from "@/hooks/useConfirm"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Plus } from "lucide-react"
import { useState } from "react"

export function MarketingDebugComponents() {
  const [currentPage] = useState(0)
  const [itemsPerPage] = useState(10)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  console.log("MarketingDebugComponents: All imports successful:", {
    CampaignFormModal,
    useConfirm,
    ConfirmDialog,
  })

  // Test TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns", currentPage, itemsPerPage],
    queryFn: () =>
      getCampaigns({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
      }),
  })

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

  const handleOpenModal = () => {
    console.log("Opening modal...")
    setIsFormModalOpen(true)
  }

  const handleCloseModal = () => {
    console.log("Closing modal...")
    setIsFormModalOpen(false)
  }

  const handleModalSuccess = () => {
    console.log("Modal success...")
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
    console.error("MarketingDebugComponents: Error occurred:", error)
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
  console.log("MarketingDebugComponents: About to render...")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Debug Components
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Testing useConfirm + CampaignFormModal - Step 3
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleTestConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Test Confirm
          </button>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Open Modal
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <div className="space-y-4">
          <div>
            <strong>Campaigns loaded:</strong> {campaigns.length}
          </div>
          <div>
            <strong>Modal open:</strong> {isFormModalOpen ? "Yes" : "No"}
          </div>
          <div>
            <strong>CampaignFormModal available:</strong>{" "}
            {CampaignFormModal ? "Yes" : "No"}
          </div>
          <div>
            <strong>CampaignFormModal type:</strong> {typeof CampaignFormModal}
          </div>
          <div>
            <strong>ConfirmDialog available:</strong>{" "}
            {ConfirmDialog ? "Yes" : "No"}
          </div>
          <div>
            <strong>ConfirmDialog type:</strong> {typeof ConfirmDialog}
          </div>
        </div>
      </div>

      {console.log("About to render ConfirmDialog:", ConfirmDialog)}
      {/* This might be the source of React error #130 */}
      {ConfirmDialog}

      {console.log("About to render CampaignFormModal with props:", {
        isOpen: isFormModalOpen,
        onClose: handleCloseModal,
        onSuccess: handleModalSuccess,
      })}
      {/* This might be the source of React error #130 */}
      <CampaignFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
      />

      {console.log("Both components rendered successfully")}
    </div>
  )
}
