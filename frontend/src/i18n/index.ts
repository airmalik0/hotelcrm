import { en } from "./locales/en"
import { ru } from "./locales/ru"
import { uz } from "./locales/uz"

export type Language = "en" | "ru" | "uz"
export type Currency = "USD" | "RUB" | "UZS"

export const translations = {
  en,
  ru,
  uz,
} as const

export const defaultLanguage: Language = "en"
export const defaultCurrency: Currency = "USD"

// Language display names
export const languages = {
  en: "English",
  ru: "Русский",
  uz: "O'zbek",
} as const

// Currency display names
export const currencies = {
  USD: "US Dollar ($)",
  RUB: "Russian Ruble (₽)",
  UZS: "Uzbek Sum (сум)",
} as const

// Currency locale mapping
export const currencyLocales: Record<Currency, string> = {
  USD: "en-US",
  RUB: "ru-RU",
  UZS: "uz-UZ",
}

// Currency symbols for charts (short format)
export const currencySymbols: Record<Currency, string> = {
  USD: "$",
  RUB: "₽",
  UZS: "сум",
}

// Get browser language
export function getBrowserLanguage(): Language {
  const browserLang = navigator.language.split("-")[0]
  if (browserLang === "ru" || browserLang === "uz") {
    return browserLang
  }
  return defaultLanguage
}

// Get translation function
export function getTranslation(language: Language) {
  return translations[language] || translations[defaultLanguage]
}
