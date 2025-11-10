import { useLanguage } from "@/contexts/LanguageContext"

/**
 * Hook to get translation function
 * Usage: const { t } = useTranslation(); t("nav.dashboard")
 */
export function useTranslation() {
  const { t } = useLanguage()
  return { t }
}

/**
 * Hook to get currency formatting function
 * Usage: const { formatCurrency } = useCurrency(); formatCurrency(1000)
 */
export function useCurrency() {
  const { currency } = useLanguage()
  return { currency }
}
