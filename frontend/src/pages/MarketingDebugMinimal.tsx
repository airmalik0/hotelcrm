// Minimal debug version to isolate React error #130
import { useState } from "react"

export function MarketingDebugMinimal() {
  const [counter, setCounter] = useState(0)

  console.log("MarketingDebugMinimal: Component mounting...")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Debug Minimal
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Testing basic React rendering - Step 1
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCounter((c) => c + 1)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Counter: {counter}
        </button>
      </div>

      <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
        <p className="text-neutral-600 dark:text-neutral-400">
          If you see this, basic React rendering works.
        </p>
      </div>
    </div>
  )
}
