// Unified API error response types

export interface ValidationErrorDetail {
  field: string
  message: string
  type: string
}

export interface APIErrorResponse {
  detail: string
  errors?: ValidationErrorDetail[]
  status_code?: number
}

// Type guard to check if an error response has validation errors
export function hasValidationErrors(data: unknown): data is APIErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'errors' in data &&
    Array.isArray((data as APIErrorResponse).errors)
  )
}