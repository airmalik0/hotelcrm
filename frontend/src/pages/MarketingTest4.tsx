// Test component to isolate useConfirm issue
import { useConfirm } from "@/hooks/useConfirm"

export function MarketingTest4() {
  const { confirm, ConfirmDialog } = useConfirm()

  console.log("useConfirm:", { confirm, ConfirmDialog })

  return (
    <div>
      Testing useConfirm...
      {ConfirmDialog}
    </div>
  )
}
