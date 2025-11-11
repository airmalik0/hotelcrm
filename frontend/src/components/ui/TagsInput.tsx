import { useLanguage } from "@/contexts/LanguageContext"
import { X } from "lucide-react"
import type React from "react"
import { useState } from "react"

interface TagsInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  availableTags: Array<{ value: string; label: string }>
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
}

export function TagsInput({
  value = [],
  onChange,
  availableTags,
  placeholder = "Select or add tags...",
  label,
  error,
  disabled = false,
}: TagsInputProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Set default placeholder if not provided
  const defaultPlaceholder = placeholder || t.ui.tagsInput.selectOrAddTags

  const handleAddTag = (tag: string) => {
    if (!value.includes(tag)) {
      onChange([...value, tag])
    }
    setSearchTerm("")
    setIsOpen(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  const filteredTags = availableTags.filter(
    (tag) =>
      !value.includes(tag.value) &&
      tag.label.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "loyal":
        return "bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400"
      case "vip":
        return "bg-warning-100 dark:bg-warning-600/30 text-warning-600 dark:text-warning-400"
      case "problematic":
        return "bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400"
      default:
        return "bg-neutral-100 dark:bg-neutral-600/30 text-neutral-600 dark:text-neutral-400"
    }
  }

  return (
    <div>
      {label && (
        <label className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        <div
          className={`border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-2 min-h-[42px] ${
            error ? "border-danger-600" : ""
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}`}
          onClick={() => !disabled && setIsOpen(true)}
        >
          <div className="flex flex-wrap gap-2">
            {value.map((tag) => {
              const tagOption = availableTags.find((t) => t.value === tag)
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getTagColor(
                    tag,
                  )}`}
                >
                  {tagOption?.label || tag}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveTag(tag)
                      }}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </span>
              )
            })}
            {value.length === 0 && (
              <span className="text-neutral-500 dark:text-neutral-400">
                {defaultPlaceholder}
              </span>
            )}
          </div>
        </div>

        {isOpen && !disabled && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-2 border border-neutral-300 dark:border-neutral-500 rounded-lg shadow-lg">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.ui.tagsInput.searchTags}
                className="w-full px-3 py-2 border-b border-neutral-200 dark:border-neutral-600 bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="max-h-48 overflow-y-auto">
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => handleAddTag(tag.value)}
                      className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white"
                    >
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTagColor(
                          tag.value,
                        )}`}
                      >
                        {tag.label}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-neutral-500 dark:text-neutral-400">
                    {t.ui.tagsInput.noTagsAvailable}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-danger-600 text-sm mt-1">{error}</p>}
    </div>
  )
}
