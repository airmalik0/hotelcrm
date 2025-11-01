import {
  defaultCurrency,
  getBrowserLanguage,
  getTranslation,
  type Currency,
  type Language,
} from "@/i18n"
import { getSystemSettings } from "@/api/systemSettings"
import { useQuery } from "@tanstack/react-query"
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"

interface LanguageContextType {
  language: Language
  currency: Currency
  setLanguage: (lang: Language) => void
  setCurrency: (curr: Currency) => void
  t: ReturnType<typeof getTranslation>
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // Load system settings from API
  const { data: systemSettings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: getSystemSettings,
    staleTime: 0, // Always refetch when invalidated
    refetchOnMount: true,
    retry: 1,
  })

  // Initialize from system settings or defaults - use useMemo to recalculate on systemSettings change
  const language = useMemo((): Language => {
    if (systemSettings?.language && (systemSettings.language === "en" || systemSettings.language === "ru" || systemSettings.language === "uz")) {
      return systemSettings.language as Language
    }
    return getBrowserLanguage()
  }, [systemSettings?.language])

  const currency = useMemo((): Currency => {
    if (systemSettings?.currency && (systemSettings.currency === "USD" || systemSettings.currency === "RUB" || systemSettings.currency === "UZS")) {
      return systemSettings.currency as Currency
    }
    return defaultCurrency
  }, [systemSettings?.currency])

  // Placeholder functions - settings should be updated via Settings page (admin only)
  const setLanguage = (_lang: Language) => {
    // This should not be called directly - use Settings page
    console.warn("setLanguage should not be called directly. Use Settings page to update system settings.")
  }

  const setCurrency = (_curr: Currency) => {
    // This should not be called directly - use Settings page
    console.warn("setCurrency should not be called directly. Use Settings page to update system settings.")
  }

  // Memoize context value to ensure it updates when language or currency changes
  const value = useMemo<LanguageContextType>(() => ({
    language,
    currency,
    setLanguage,
    setCurrency,
    t: getTranslation(language),
  }), [language, currency])

  // Show loading state with defaults if settings not loaded yet
  if (isLoading) {
    const loadingValue: LanguageContextType = {
      language: getBrowserLanguage(),
      currency: defaultCurrency,
      setLanguage,
      setCurrency,
      t: getTranslation(getBrowserLanguage()),
    }
    return (
      <LanguageContext.Provider value={loadingValue}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

