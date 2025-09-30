// Test component to isolate the issue with types
import type {
  CampaignPublic,
  CampaignStatus,
  CampaignType,
} from "@/client/types.gen"

export function MarketingTest2() {
  const test: CampaignStatus = "draft"
  const test2: CampaignType = "onetime"

  console.log("Types working:", { test, test2 })
  return <div>Testing types...</div>
}