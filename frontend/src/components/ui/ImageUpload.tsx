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
    value ? `/api/v1/files/${value}` : null
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
      const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
      if (!acceptedFormats.includes(fileExt)) {
        showError(`Invalid file type. Accepted formats: ${acceptedFormats.join(", ")}`)
        return
      }

      // Upload file
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await apiClient.post("/api/v1/files/upload/passport", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })

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
    [acceptedFormats, maxSizeMB, onChange]
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setPreviewUrl(null)
  }, [onChange])

  return (
    <div className="flex items-center gap-3">
      {/* Preview */}
      {previewUrl && (
        <div className="relative h-[120px] w-[120px] border border-neutral-300 dark:border-neutral-500 rounded-lg overflow-hidden border-dashed bg-neutral-50 dark:bg-neutral-600">
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className="absolute top-1 right-1 z-10 bg-white dark:bg-neutral-800 rounded-full p-1 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label="Remove photo"
          >
            <X className="w-4 h-4 text-red-600" />
          </button>
          <img
            src={previewUrl}
            alt="Passport preview"
            className="w-full h-full object-cover"
            onError={() => {
              // Fallback for broken images
              setPreviewUrl(null)
            }}
          />
        </div>
      )}

      {/* Upload button */}
      {!previewUrl && (
        <label
          className={`
            h-[120px] w-[120px]
            border border-neutral-300 dark:border-neutral-500
            rounded-lg overflow-hidden border-dashed
            bg-neutral-50 dark:bg-neutral-600
            hover:bg-neutral-100 dark:hover:bg-neutral-500
            flex items-center flex-col justify-center gap-1
            cursor-pointer transition-colors
            ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Uploading...
              </span>
            </>
          ) : (
            <>
              <Camera className="w-6 h-6 text-neutral-600 dark:text-neutral-300" />
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                {label}
              </span>
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
      )}
    </div>
  )
}