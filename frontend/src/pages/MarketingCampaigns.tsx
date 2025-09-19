import { Mail, Zap } from "lucide-react"

export function MarketingCampaigns() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Marketing Campaigns
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Automated triggers and bulk messaging campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      {/* Description Card */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200 dark:border-green-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Intelligent Marketing Automation
            </h3>
            <p className="text-neutral-700 dark:text-neutral-300 mb-4">
              Marketing campaigns with trigger automation and bulk messaging
              capabilities:
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  Trigger Campaigns
                </h4>
                <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Automatic SMS when customer hasn't visited for 30+ days
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Personalization with customer first name & last name
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    VIP customer triggers (3+ visits milestone)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Birthday celebration messages
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Bulk Campaigns
                </h4>
                <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Customer tag-based filtering
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Geographic segmentation by districts
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Age group targeting filters
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Scheduled sending with optimal timing
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="text-center py-12 bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-neutral-500 dark:text-neutral-400" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
          Marketing Automation Coming Soon
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
          Intelligent marketing campaigns with trigger automation and customer
          segmentation will be implemented in the next development phase.
        </p>
      </div>
    </div>
  )
}
