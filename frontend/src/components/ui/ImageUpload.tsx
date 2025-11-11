import { useLanguage } from "@/contexts/LanguageContext"
import { apiClient } from "@/lib/axios"
import { showError, showSuccess } from "@/utils/error-handling"
import { getFileUrl } from "@/utils/file-urls"
import { Camera, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

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
  label,
  disabled = false,
  maxSizeMB = 5,
  acceptedFormats = [".jpg", ".jpeg", ".png", ".webp"],
}: ImageUploadProps) {
  const { t } = useLanguage()
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(getFileUrl(value))

  // Set default label if not provided
  const defaultLabel = label || t.ui.imageUpload.uploadPhoto

  // Update preview URL when value prop changes
  useEffect(() => {
    setPreviewUrl(getFileUrl(value))
  }, [value])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file size
      const maxSize = maxSizeMB * 1024 * 1024
      if (file.size > maxSize) {
        showError(
          t.ui.imageUpload.fileSizeError.replace(
            "{size}",
            maxSizeMB.toString(),
          ),
        )
        return
      }

      // Validate file type
      const fileExt = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase()
      if (!acceptedFormats.includes(fileExt)) {
        showError(
          t.ui.imageUpload.invalidFileType.replace(
            "{formats}",
            acceptedFormats.join(", "),
          ),
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

        showSuccess(t.ui.imageUpload.photoUploadedSuccess)
      } catch (error) {
        showError(t.ui.imageUpload.failedToUploadPhoto)
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
            aria-label={t.ui.imageUpload.removePhoto}
          >
            <X className="w-4 h-4 text-danger-600 dark:text-danger-400" />
          </button>
          <div className="border border-neutral-300 dark:border-neutral-500 rounded-lg overflow-hidden bg-white dark:bg-neutral-900">
            <img
              src={previewUrl}
              alt={t.ui.imageUpload.passportPreview}
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
                  {t.ui.imageUpload.uploading}
                </span>
              </>
            ) : (
              <>
                <Camera className="w-12 h-12 text-neutral-600 dark:text-neutral-300" />
                <div className="text-center">
                  <span className="text-base font-medium text-neutral-600 dark:text-neutral-300 block">
                    {defaultLabel}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 block">
                    {t.ui.imageUpload.clickToUploadPassport}
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
