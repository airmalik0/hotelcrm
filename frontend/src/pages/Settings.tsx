import { useLanguage } from "@/contexts/LanguageContext"
import { showError, showSuccess } from "@/utils/error-handling"
import { type Currency, type Language, currencies, languages } from "@/i18n"
import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSystemSettings, updateSystemSettings } from "@/api/systemSettings"
import { Settings as SettingsIcon } from "lucide-react"

export function Settings() {
  const { language, currency, t } = useLanguage()
  const queryClient = useQueryClient()

  // Load current system settings
  const { data: systemSettings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: getSystemSettings,
  })

  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency)

  // Update local state when system settings load or when context updates
  useEffect(() => {
    if (systemSettings) {
      if (systemSettings.language && (systemSettings.language === "en" || systemSettings.language === "ru" || systemSettings.language === "uz")) {
        setSelectedLanguage(systemSettings.language as Language)
      }
      if (systemSettings.currency && (systemSettings.currency === "USD" || systemSettings.currency === "RUB" || systemSettings.currency === "UZS")) {
        setSelectedCurrency(systemSettings.currency as Currency)
      }
    }
  }, [systemSettings])

  // Also sync with context values when they change (after successful update)
  useEffect(() => {
    setSelectedLanguage(language)
    setSelectedCurrency(currency)
  }, [language, currency])

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { language?: Language; currency?: Currency }) => {
      return await updateSystemSettings({
        language: data.language,
        currency: data.currency,
      })
    },
    onSuccess: async () => {
      // Invalidate and refetch to update context
      await queryClient.invalidateQueries({ queryKey: ["system-settings"] })
      await queryClient.refetchQueries({ queryKey: ["system-settings"] })
      showSuccess(t.settings.saved)
    },
    onError: (error) => {
      showError(error, t.settings.error)
    },
  })

  const handleSave = async () => {
    const updates: { language?: Language; currency?: Currency } = {}

    if (selectedLanguage !== language) {
      updates.language = selectedLanguage
    }

    if (selectedCurrency !== currency) {
      updates.currency = selectedCurrency
    }

    if (Object.keys(updates).length > 0) {
      updateSettingsMutation.mutate(updates)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
            <div className="text-center py-8">
              <div className="text-neutral-600 dark:text-neutral-400">
                {t.common.loading}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-200 dark:border-neutral-600 p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-600 text-white rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                {t.settings.title}
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t.settings.selectLanguage} / {t.settings.selectCurrency}
              </p>
            </div>
          </div>

          {/* Settings Form */}
          <div className="space-y-6">
            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {t.settings.language}
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) =>
                  setSelectedLanguage(e.target.value as Language)
                }
                className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-300 focus:outline-none"
              >
                {Object.entries(languages).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {t.settings.currency}
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) =>
                  setSelectedCurrency(e.target.value as Currency)
                }
                className="w-full px-4 py-2.5 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-300 focus:outline-none"
              >
                {Object.entries(currencies).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-600">
              <button
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
                className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {updateSettingsMutation.isPending
                  ? t.common.loading
                  : t.common.save}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

