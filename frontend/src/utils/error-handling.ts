import { isAxiosError } from "axios"
import toast from "react-hot-toast"
import type { APIErrorResponse, ValidationErrorDetail } from "@/types/errors"
import { hasValidationErrors } from "@/types/errors"

interface ErrorHandlerOptions {
  /** Fallback message if no specific error can be extracted */
  fallbackMessage?: string
  /** Whether to show toast notification (default: true) */
  showToast?: boolean
  /** Custom action to perform instead of/in addition to toast */
  onError?: (message: string) => void
}

/**
 * Centralized error handler for API and other errors
 * Best practices:
 * - API errors (400/500) -> toast notifications
 * - Form validation errors -> return structured errors for setErrors
 * - Network errors -> toast with user-friendly message
 */
export class ErrorHandler {
  /**
   * Handle API errors and show appropriate notifications
   */
  static handleError(
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      fallbackMessage = "Something went wrong. Please try again.",
      showToast = true,
      onError,
    } = options

    const message = this.extractErrorMessage(error, fallbackMessage)

    if (showToast) {
      toast.error(message)
    }

    if (onError) {
      onError(message)
    }
  }

  /**
   * Extract structured validation errors for form handling
   * Returns Record<string, string> for setErrors usage
   */
  static extractValidationErrors(
    error: unknown
  ): Record<string, string> | null {
    if (!isAxiosError(error) || !error.response?.data) {
      return null
    }

    const data = error.response.data as APIErrorResponse
    const fieldErrors: Record<string, string> = {}

    // Unified format: { "detail": "Validation error", "errors": [...] }
    if (hasValidationErrors(data)) {
      data.errors?.forEach((err: ValidationErrorDetail) => {
        // Extract field name from "body -> field_name" format
        const fieldName = err.field.includes(' -> ')
          ? err.field.split(' -> ').pop() || err.field
          : err.field
        fieldErrors[fieldName] = err.message
      })
    }

    return Object.keys(fieldErrors).length > 0 ? fieldErrors : null
  }

  /**
   * Handle form submission errors with validation support
   * Shows toast for general errors, returns validation errors for forms
   */
  static handleFormError(
    error: unknown,
    options: {
      fallbackMessage?: string
      onValidationErrors?: (errors: Record<string, string>) => void
    } = {}
  ): void {
    const {
      fallbackMessage = "Failed to submit form. Please try again.",
      onValidationErrors,
    } = options

    // Try to extract validation errors first
    const validationErrors = this.extractValidationErrors(error)
    if (validationErrors && onValidationErrors) {
      onValidationErrors(validationErrors)
      // Also show a toast for validation errors to ensure user sees feedback
      const errorCount = Object.keys(validationErrors).length
      toast.error(`Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''} below`)
      return
    }

    // Fall back to general error handling
    this.handleError(error, { fallbackMessage })
  }

  /**
   * Extract human-readable error message from various error types
   */
  private static extractErrorMessage(
    error: unknown,
    fallback: string
  ): string {
    // Axios HTTP errors
    if (isAxiosError(error)) {
      // Handle JSON parsing errors
      if (error.message?.includes("JSON")) {
        return "Server response format error. Please try again or contact support."
      }

      // Handle CORS errors
      if (error.message?.includes("CORS")) {
        return "Cross-origin request blocked. Please contact support."
      }

      // Check if we got HTML instead of JSON (common server error)
      if (error.response?.data && typeof error.response.data === "string" &&
          error.response.data.includes("<html")) {
        return "Server error occurred. Please try again later."
      }

      const data = error.response?.data

      // Handle unified validation error format
      if (data?.errors && Array.isArray(data.errors)) {
        const messages = data.errors
          .map((err: any) => err.message)
          .filter(Boolean)
        return messages.length > 0
          ? messages.join(", ")
          : data.detail || fallback
      }

      // Handle simple detail string
      if (typeof data?.detail === "string") {
        return data.detail
      }

      // HTTP status fallbacks
      if (error.response?.status) {
        switch (error.response.status) {
          case 400:
            return "Invalid request. Please check your input."
          case 401:
            return "Please log in to continue."
          case 403:
            return "You don't have permission to perform this action."
          case 404:
            return "The requested resource was not found."
          case 409:
            return "This action conflicts with existing data."
          case 413:
            return "File too large. Please reduce size and try again."
          case 415:
            return "Unsupported file type. Please check the format and try again."
          case 422:
            return "Invalid data submitted. Please check your input and try again."
          case 429:
            return "Too many requests. Please wait a moment before trying again."
          case 500:
            return "Server error. Please try again later."
          case 502:
            return "Service temporarily unavailable. Please try again in a few minutes."
          case 503:
            return "Service under maintenance. Please try again later."
          case 504:
            return "Request timeout. Please check your connection and try again."
          default:
            return fallback
        }
      }

      // Network and connection errors
      if (error.code === "ECONNABORTED" || error.isTimeout) {
        return "Request timeout. The operation took too long to complete. Please try again."
      }
      if (error.code === "NETWORK_ERROR" || error.code === "ERR_NETWORK") {
        return "Network error. Please check your internet connection."
      }
      if (error.code === "ECONNREFUSED") {
        return "Connection refused. The service may be temporarily unavailable."
      }
      if (!error.response) {
        return "Unable to connect to server. Please check your connection and try again."
      }
    }

    // Generic Error objects
    if (error instanceof Error) {
      return error.message || fallback
    }

    // String errors
    if (typeof error === "string") {
      return error
    }

    return fallback
  }
}

/**
 * Convenience functions for common use cases
 */

/** Show error toast notification */
export const showError = (
  error: unknown,
  fallbackMessage?: string
): void => {
  ErrorHandler.handleError(error, { fallbackMessage })
}

/** Show success toast notification */
export const showSuccess = (message: string): void => {
  toast.success(message)
}

/** Show info toast notification */
export const showInfo = (message: string): void => {
  toast(message, { icon: "ℹ️" })
}

/** Handle form errors with validation support */
export const handleFormError = (
  error: unknown,
  onValidationErrors?: (errors: Record<string, string>) => void,
  fallbackMessage?: string
): void => {
  ErrorHandler.handleFormError(error, {
    onValidationErrors,
    fallbackMessage,
  })
}