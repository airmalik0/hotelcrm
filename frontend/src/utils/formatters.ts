/**
 * Format phone number for display
 * Takes a string of digits and formats it nicely
 * Example: "998946370416" -> "+998 94 637 04 16"
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "N/A"

  // Already contains non-digits? It's likely already formatted
  if (/\D/.test(phone)) return phone

  // Ensure we have a string of digits
  const digits = phone.replace(/\D/g, "")

  // Format based on length and patterns
  if (digits.length === 0) return "N/A"

  // Uzbekistan numbers (998 + 9 digits)
  if (digits.startsWith("998") && digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
  }

  // Russia/Kazakhstan (7 + 10 digits)
  if (digits.startsWith("7") && digits.length === 11) {
    return `+${digits.slice(0, 1)} ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`
  }

  // US/Canada (1 + 10 digits)
  if (digits.startsWith("1") && digits.length === 11) {
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  // Generic international format for other numbers
  if (digits.length >= 10) {
    // Try to format as +XX XXX XXX XXXX or similar
    let formatted = "+"
    let remaining = digits

    // Country code (1-3 digits)
    const countryCodeLength = digits.startsWith("1")
      ? 1
      : digits.startsWith("7")
        ? 1
        : 3
    formatted += `${remaining.slice(0, countryCodeLength)} `
    remaining = remaining.slice(countryCodeLength)

    // Format the rest in groups of 3-4
    while (remaining.length > 0) {
      const chunkSize =
        remaining.length > 7
          ? 3
          : remaining.length > 4
            ? Math.ceil(remaining.length / 2)
            : remaining.length
      formatted += remaining.slice(0, chunkSize)
      remaining = remaining.slice(chunkSize)
      if (remaining.length > 0) formatted += " "
    }

    return formatted.trim()
  }

  // Short numbers - just add + prefix
  return `+${digits}`
}

import { safeParseDateOrNull } from "./date-helpers"

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

/**
 * Format date
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "N/A"
  const parsedDate = safeParseDateOrNull(date)
  if (!parsedDate) return "Invalid Date"
  return parsedDate.toLocaleDateString()
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "N/A"
  const parsedDate = safeParseDateOrNull(date)
  if (!parsedDate) return "Invalid Date"
  return parsedDate.toLocaleString()
}
