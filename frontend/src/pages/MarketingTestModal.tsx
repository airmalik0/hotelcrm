// Test CampaignFormModal specifically to find React error #130 source
import { getCampaigns } from "@/api/campaigns"
import { CampaignFormModal } from "@/components/campaigns/CampaignFormModal"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle } from "lucide-react"
import { useState } from "react"

export function MarketingTestModal() {
  const [currentPage] = useState(0)
  const [itemsPerPage] = useState(10)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const queryClient = useQueryClient()

  console.log("MarketingTestModal: Starting component...")

  // Test basic query (this works)
  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns", currentPage, itemsPerPage],
    queryFn: () =>
      getCampaigns({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
      }),
  })

  console.log("MarketingTestModal: About to test CampaignFormModal")
  console.log("CampaignFormModal component:", CampaignFormModal)

  const handleCreateCampaign = () => {
    console.log("Opening modal...")
    setSelectedCampaign(null)
    setIsFormModalOpen(true)
  }

  const handleModalClose = () => {
    console.log("Closing modal...")
    setIsFormModalOpen(false)
    setSelectedCampaign(null)
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

  console.log("MarketingTestModal: About to render component with CampaignFormModal")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Test Modal
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Testing CampaignFormModal component
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateCampaign}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Open Modal
        </button>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <div className="space-y-4">
          <div><strong>Campaigns loaded:</strong> {campaigns.length}</div>
          <div><strong>Modal open:</strong> {isFormModalOpen ? "Yes" : "No"}</div>
          <div><strong>CampaignFormModal available:</strong> {CampaignFormModal ? "Yes" : "No"}</div>
          <div><strong>CampaignFormModal type:</strong> {typeof CampaignFormModal}</div>
        </div>
      </div>

      {console.log("About to render CampaignFormModal with props:", {
        isOpen: isFormModalOpen,
        onClose: handleModalClose,
        campaign: selectedCampaign,
        onSuccess: handleModalSuccess,
      })}

      {/* This is the suspected source of React error #130 */}
      <CampaignFormModal
        isOpen={isFormModalOpen}
        onClose={handleModalClose}
        campaign={selectedCampaign}
        onSuccess={handleModalSuccess}
      />

      {console.log("CampaignFormModal rendered successfully")}
    </div>
  )
}