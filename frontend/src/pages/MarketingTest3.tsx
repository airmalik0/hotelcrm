// Test component to isolate the CampaignFormModal issue
import { CampaignFormModal } from "@/components/campaigns/CampaignFormModal"

console.log("CampaignFormModal:", CampaignFormModal)

export function MarketingTest3() {
  return (
    <div>
      Testing CampaignFormModal...
      <CampaignFormModal
        isOpen={false}
        onClose={() => {}}
        campaign={null}
        onSuccess={() => {}}
      />
    </div>
  )
}
