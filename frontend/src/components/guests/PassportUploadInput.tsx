import { ImageUpload } from "@/components/ui/ImageUpload"

interface PassportUploadInputProps {
  value?: string | null
  onChange: (path: string | null) => void
  disabled?: boolean
  required?: boolean
  error?: string
}

export function PassportUploadInput({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
}: PassportUploadInputProps) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
        Passport Photo {required && <span className="text-danger-600">*</span>}
      </label>
      <ImageUpload
        value={value}
        onChange={onChange}
        label="Upload Passport"
        disabled={disabled}
        maxSizeMB={5}
        acceptedFormats={[".jpg", ".jpeg", ".png", ".webp"]}
      />
      {error && (
        <p className="mt-2 text-sm text-danger-600 dark:text-danger-500">
          {error}
        </p>
      )}
    </div>
  )
}
