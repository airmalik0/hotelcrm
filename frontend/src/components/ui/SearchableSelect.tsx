import { ChevronDown, MapPin, Search, X } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState } from "react"

interface SearchableSelectProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  error?: string
  label?: string
  required?: boolean
  icon?: React.ReactNode
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error,
  label,
  required,
  icon = <MapPin className="w-4 h-4" />,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Get display value
  const selectedOption = options.find((opt) => opt.value === value)
  const displayValue = selectedOption?.label || ""

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [searchTerm])

  const handleOpen = () => {
    setIsOpen(true)
    setSearchTerm("")
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSearchTerm("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        handleOpen()
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev,
        )
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value)
        }
        break
      case "Escape":
        e.preventDefault()
        setIsOpen(false)
        setSearchTerm("")
        break
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="inline-block font-semibold text-neutral-600 dark:text-neutral-200 text-sm mb-2">
          {label} {required && <span className="text-danger-600">*</span>}
        </label>
      )}

      {/* Main Select Button */}
      <div
        onClick={handleOpen}
        className={`relative cursor-pointer border rounded-lg bg-neutral-50 dark:bg-neutral-700 px-4 py-2.5 w-full text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus-within:ring-2 focus-within:ring-primary-300 ${
          error
            ? "border-danger-600"
            : "border-neutral-300 dark:border-neutral-500"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 dark:text-neutral-400">{icon}</span>
          <span
            className={`flex-1 ${!displayValue ? "text-neutral-500 dark:text-neutral-400" : ""}`}
          >
            {displayValue || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <ChevronDown
              className={`w-4 h-4 text-neutral-500 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-neutral-200 dark:border-neutral-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type to search..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-4 py-2.5 cursor-pointer flex items-center gap-2 transition-colors ${
                    index === highlightedIndex
                      ? "bg-primary-50 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  } ${
                    option.value === value
                      ? "bg-primary-100 dark:bg-primary-600/25 text-primary-600 dark:text-primary-400 font-medium"
                      : ""
                  }`}
                >
                  <span className="text-neutral-400 dark:text-neutral-500">
                    {icon}
                  </span>
                  <span>{option.label}</span>
                  {option.value === value && (
                    <span className="ml-auto text-primary-600 dark:text-primary-400">
                      ✓
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Results Count */}
          {searchTerm && (
            <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-600">
              {filteredOptions.length} result
              {filteredOptions.length !== 1 ? "s" : ""} found
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-danger-600 text-sm mt-1">{error}</p>}
    </div>
  )
}
