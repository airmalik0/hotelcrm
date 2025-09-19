/**
 * Utility for fitting text into available space with different display strategies
 */

interface TextMeasurementContext {
  canvas?: HTMLCanvasElement
  context?: CanvasRenderingContext2D
}

const measurementCache: TextMeasurementContext = {}

/**
 * Initialize or get canvas context for text measurement
 */
function getTextMeasurementContext(): CanvasRenderingContext2D {
  if (!measurementCache.canvas) {
    measurementCache.canvas = document.createElement("canvas")
    const context = measurementCache.canvas.getContext("2d")
    if (!context) {
      throw new Error("Unable to create 2D canvas context")
    }
    measurementCache.context = context
  }
  return measurementCache.context!
}

/**
 * Measure text width with given font properties
 */
function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily = "system-ui, -apple-system, sans-serif",
): number {
  const ctx = getTextMeasurementContext()
  ctx.font = `${fontSize}px ${fontFamily}`
  return ctx.measureText(text).width
}

/**
 * Generate name display variants in order of preference
 */
function generateNameVariants(fullName: string): string[] {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length === 0) return ["?"]
  if (parts.length === 1) return [parts[0], `${parts[0][0]}.`]

  const firstName = parts[0]
  const lastName = parts[parts.length - 1]
  const firstInitial = `${firstName[0]?.toUpperCase()}.`
  const lastInitial = `${lastName[0]?.toUpperCase()}.`

  return [
    // Full name
    `${firstName} ${lastName}`,
    // First name + last initial
    `${firstName} ${lastInitial}`,
    // Just first name
    firstName,
    // Both initials
    `${firstInitial}${lastInitial}`,
    // Just first initial
    firstInitial,
    // Fallback
    "?",
  ]
}

/**
 * Find the best fitting text variant for the available width
 */
export function getBestFittingName(
  fullName: string,
  availableWidth: number,
  fontSize: number,
  padding = 8, // Account for padding and margins
): string {
  const effectiveWidth = Math.max(0, availableWidth - padding)

  if (effectiveWidth <= 0) return ""

  const variants = generateNameVariants(fullName)

  // Find the first variant that fits
  for (const variant of variants) {
    const textWidth = measureTextWidth(variant, fontSize)
    if (textWidth <= effectiveWidth) {
      return variant
    }
  }

  return "" // Nothing fits
}

/**
 * Check if full name fits in available space
 */
export function doesFullNameFit(
  fullName: string,
  availableWidth: number,
  fontSize: number,
  padding = 8,
): boolean {
  const effectiveWidth = Math.max(0, availableWidth - padding)
  const textWidth = measureTextWidth(fullName, fontSize)
  return textWidth <= effectiveWidth
}

/**
 * Get recommended minimum width for readable text
 */
export function getMinimumReadableWidth(fontSize: number): number {
  // Minimum width should fit at least "A.B." (initials)
  return measureTextWidth("A.B.", fontSize) + 8 // + padding
}
