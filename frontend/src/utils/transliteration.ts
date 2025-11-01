/**
 * Transliteration utilities for converting between Latin and Cyrillic scripts
 * Ported from backend/app/scripts/import_customers_from_excel.py
 */

// List of various apostrophe characters to normalize
const APOSTROPHES = ["'", "'", "ʼ", "`", "´", "ʹ", "ʽ", "ˈ", "ʻ"]

/**
 * Normalize all apostrophe variants to a single character (U+02BB)
 */
function normalizeApostrophes(text: string): string {
  let result = text
  for (const ch of APOSTROPHES) {
    result = result.replace(new RegExp(ch, "g"), "ʻ")
  }
  return result
}

/**
 * Check if text contains Cyrillic characters
 */
function isCyrillic(text: string): boolean {
  return Array.from(text).some((ch) => {
    const code = ch.charCodeAt(0)
    return code >= 0x0400 && code <= 0x04ff
  })
}

/**
 * Check if text contains Latin characters
 */
function isLatin(text: string): boolean {
  return Array.from(text).some((ch) => {
    return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z")
  })
}

/**
 * Determine case flags for a word (all uppercase, title case)
 */
function wordCaseFlags(word: string): [boolean, boolean] {
  const isAllUpper = word === word.toUpperCase() && word !== word.toLowerCase()
  const isTitle =
    word.length > 0 &&
    word[0] === word[0].toUpperCase() &&
    word.slice(1) === word.slice(1).toLowerCase()
  return [isAllUpper, isTitle]
}

/**
 * Apply case pattern from sample word to mapped word
 */
function applyCase(sample: string, mapped: string): string {
  const [isAllUpper, isTitle] = wordCaseFlags(sample)
  if (isAllUpper) {
    return mapped.toUpperCase()
  }
  if (isTitle) {
    return mapped.length > 0
      ? mapped[0].toUpperCase() + mapped.slice(1).toLowerCase()
      : mapped
  }
  return mapped
}

/**
 * Transliterate Latin word to Cyrillic (Uzbek alphabet)
 */
function translitLatToCyrWord(word: string): string {
  const w = normalizeApostrophes(word)
  const out: string[] = []
  let i = 0

  while (i < w.length) {
    // Check for two/three-letter sequences first
    const chunk2 = w.slice(i, i + 2)
    const chunk2Low = chunk2.toLowerCase()

    // Two-letter mappings
    if (chunk2Low === "sh") {
      out.push("ш")
      i += 2
      continue
    }
    if (chunk2Low === "ch") {
      out.push("ч")
      i += 2
      continue
    }
    if (chunk2Low === "ng") {
      out.push("нг")
      i += 2
      continue
    }
    if (chunk2Low === "oʻ" || chunk2Low === "o'") {
      out.push("ў")
      i += 2
      continue
    }
    if (chunk2Low === "gʻ" || chunk2Low === "g'") {
      out.push("ғ")
      i += 2
      continue
    }
    if (chunk2Low === "yo") {
      out.push("ё")
      i += 2
      continue
    }
    if (chunk2Low === "yu") {
      out.push("ю")
      i += 2
      continue
    }
    if (chunk2Low === "ya") {
      out.push("я")
      i += 2
      continue
    }
    if (chunk2Low === "ye") {
      out.push("е")
      i += 2
      continue
    }

    // Single-letter mapping
    const ch = w[i]
    const low = ch.toLowerCase()
    const mapping: Record<string, string> = {
      a: "а",
      b: "б",
      c: "с", // fallback
      d: "д",
      e: "е",
      f: "ф",
      g: "г",
      h: "ҳ",
      i: "и",
      j: "ж",
      k: "к",
      l: "л",
      m: "м",
      n: "н",
      o: "о",
      p: "п",
      q: "қ",
      r: "р",
      s: "с",
      t: "т",
      u: "у",
      v: "в",
      w: "в",
      x: "х",
      y: "й",
      z: "з",
      ʻ: "ʼ", // ignore apostrophe in Cyrillic
    }

    const mapped = mapping[low] || ch
    out.push(applyCase(ch, mapped))
    i += 1
  }

  return out.join("")
}

/**
 * Transliterate Cyrillic word to Latin (Uzbek alphabet)
 */
function translitCyrToLatWord(word: string): string {
  const out: string[] = []

  for (let idx = 0; idx < word.length; idx++) {
    const ch = word[idx]
    const low = ch.toLowerCase()
    const mapping: Record<string, string> = {
      а: "a",
      б: "b",
      в: "v",
      г: "g",
      ғ: "gʻ",
      д: "d",
      е: idx > 0 ? "e" : "ye",
      ё: "yo",
      ж: "j",
      з: "z",
      и: "i",
      й: "y",
      к: "k",
      қ: "q",
      л: "l",
      м: "m",
      н: "n",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ў: "oʻ",
      ф: "f",
      х: "x",
      ҳ: "h",
      ц: "ts",
      ч: "ch",
      ш: "sh",
      щ: "shch",
      ъ: "",
      ь: "",
      ю: "yu",
      я: "ya",
      ы: "i",
      э: "e",
    }

    const mapped = mapping[low] || ch
    out.push(applyCase(ch, mapped))
  }

  return out.join("")
}

/**
 * Extract first token from name (split by whitespace/commas/semicolons)
 */
function extractFirstToken(name: string): string {
  if (!name) return ""
  // Split by whitespace or commas/semicolons, keep hyphens inside tokens
  const parts = name.trim().split(/[\s,;]+/)
  return parts.length > 0 ? parts[0] : ""
}

/**
 * Normalize name to both Latin and Cyrillic variants
 * Returns [latin, cyrillic] tuple
 */
export function normalizeNameDual(rawName: string): [string, string | null] {
  const token = extractFirstToken(rawName)
  if (!token) {
    return ["_", null]
  }

  const normalizedToken = normalizeApostrophes(token)
  const hasCyr = isCyrillic(normalizedToken)
  const hasLat = isLatin(normalizedToken)

  let lat: string
  let cyr: string

  // Prefer the dominant script; if mixed, prioritize Cyrillic
  if (hasCyr && !hasLat) {
    cyr = normalizedToken
    lat = translitCyrToLatWord(normalizedToken)
  } else if (hasLat && !hasCyr) {
    lat = normalizedToken
    cyr = translitLatToCyrWord(normalizedToken)
  } else {
    // Mixed or unknown: default to Cyrillic path
    cyr = normalizedToken
    lat = translitCyrToLatWord(normalizedToken)
  }

  // Normalize to title-case for stability (passport-style)
  const latNorm = lat.length > 0 ? lat[0].toUpperCase() + lat.slice(1).toLowerCase() : lat
  const cyrNorm = cyr.length > 0 ? cyr[0].toUpperCase() + cyr.slice(1).toLowerCase() : cyr

  return [latNorm, cyrNorm]
}

/**
 * Generate Cyrillic name from Latin first name
 * This is the main function to use in forms
 */
export function generateCyrillicName(firstName: string): string {
  const [, cyrillic] = normalizeNameDual(firstName)
  return cyrillic || ""
}
