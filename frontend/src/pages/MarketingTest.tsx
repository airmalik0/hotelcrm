// Test component to isolate the issue
import {
  deleteCampaign,
  executeCampaign,
  getCampaigns,
  previewCampaignRecipients,
} from "@/api/campaigns"

console.log("API functions:", {
  deleteCampaign,
  executeCampaign,
  getCampaigns,
  previewCampaignRecipients,
})

export function MarketingTest() {
  return <div>Testing API functions...</div>
}