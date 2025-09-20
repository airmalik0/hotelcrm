import { apiClient } from "@/lib/axios"
import { showError, showSuccess } from "@/utils/error-handling"
import { Camera, X } from "lucide-react"
import { useCallback, useState } from "react"

interface ImageUploadProps {
  value?: string | null
  onChange: (path: string | null) => void
  label?: string
  disabled?: boolean
  maxSizeMB?: number
  acceptedFormats?: string[]
}

export function ImageUpload({
  value,
  onChange,
  label = "Upload Photo",
  disabled = false,
  maxSizeMB = 5,
  acceptedFormats = [".jpg", ".jpeg", ".png", ".webp"],
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    value ? `/api/v1/files/${value}` : null,
  )

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file size
      const maxSize = maxSizeMB * 1024 * 1024
      if (file.size > maxSize) {
        showError(`File size must be less than ${maxSizeMB}MB`)
        return
      }

      // Validate file type
      const fileExt = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase()
      if (!acceptedFormats.includes(fileExt)) {
        showError(
          `Invalid file type. Accepted formats: ${acceptedFormats.join(", ")}`,
        )
        return
      }

      // Upload file
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await apiClient.post(
          "/api/v1/files/upload/passport",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          },
        )

        const { path } = response.data
        onChange(path)

        // Create preview URL from the uploaded file
        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)

        showSuccess("Photo uploaded successfully")
      } catch (error) {
        showError("Failed to upload photo")
        console.error("Upload error:", error)
      } finally {
        setUploading(false)
        // Reset input
        event.target.value = ""
      }
    },
    [acceptedFormats, maxSizeMB, onChange],
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setPreviewUrl(null)
  }, [onChange])

  return (
    <div className="w-full">
      {/* Preview */}
      {previewUrl && (
        <div className="relative max-w-md mx-auto">
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className="absolute top-2 right-2 z-10 bg-white dark:bg-neutral-800 rounded-full p-1.5 hover:bg-danger-50 dark:hover:bg-danger-600/30 transition-colors shadow-md"
            aria-label="Remove photo"
          >
            <X className="w-4 h-4 text-danger-600" />
          </button>
          <div className="border border-neutral-300 dark:border-neutral-500 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
            <img
              src={previewUrl}
              alt="Passport preview"
              className="w-full h-auto object-contain"
              style={{ maxHeight: "400px", aspectRatio: "3/4" }}
              onError={() => {
                // Fallback for broken images
                setPreviewUrl(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Upload button */}
      {!previewUrl && (
        <div className="max-w-md mx-auto">
          <label
            className={`
              w-full h-64
              border-2 border-neutral-300 dark:border-neutral-500
              rounded-lg border-dashed
              bg-neutral-50 dark:bg-neutral-700
              hover:bg-neutral-100 dark:hover:bg-neutral-600
              flex items-center flex-col justify-center gap-3
              cursor-pointer transition-colors
              ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}
            `}
            style={{ aspectRatio: "3/4" }}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                <span className="text-base font-medium text-neutral-600 dark:text-neutral-300">
                  Uploading...
                </span>
              </>
            ) : (
              <>
                <Camera className="w-12 h-12 text-neutral-600 dark:text-neutral-300" />
                <div className="text-center">
                  <span className="text-base font-medium text-neutral-600 dark:text-neutral-300 block">
                    {label}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 block">
                    Click to upload passport photo
                  </span>
                </div>
              </>
            )}
            <input
              type="file"
              accept={acceptedFormats.join(",")}
              onChange={handleFileSelect}
              disabled={disabled || uploading}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  )
}
