/**
 * Utility for generating proper file URLs that work in both development and production
 */

/**
 * Get the full URL for a file path, ensuring it points to the API server in production
 * @param path - The file path (e.g., "passports/123_abc.jpg")
 * @returns The full URL to access the file
 */
export function getFileUrl(path: string | null | undefined): string | null {
  if (!path) return null

  const baseURL = import.meta.env.VITE_API_URL || ""

  // In production, we need the full API URL
  // In development with Vite proxy, relative URLs work fine
  return baseURL
    ? `${baseURL}/api/v1/files/${path}`
    : `/api/v1/files/${path}`
}

/**
 * Check if a file URL is valid and accessible
 * @param url - The URL to check
 * @returns Whether the URL appears valid
 */
export function isValidFileUrl(url: string | null | undefined): boolean {
  if (!url) return false

  try {
    const urlObj = new URL(url, window.location.origin)
    return urlObj.pathname.includes('/api/v1/files/')
  } catch {
    return false
  }
}