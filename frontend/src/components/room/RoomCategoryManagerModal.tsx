import {
  createRoomCategory,
  deleteRoomCategory,
  getRoomCategories,
} from "@/api/rooms"
import type {
  RoomCategoriesPublic,
  RoomCategoryCreate,
  RoomCategoryPublic,
} from "@/client/types.gen"
import { useLanguage } from "@/contexts/LanguageContext"
import { handleFormError, showError, showSuccess } from "@/utils/error-handling"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, X } from "lucide-react"
import { useState } from "react"

interface RoomCategoryManagerModalProps {
  onClose: () => void
}

export function RoomCategoryManagerModal({
  onClose,
}: RoomCategoryManagerModalProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data, isLoading, error } = useQuery<RoomCategoriesPublic>({
    queryKey: ["room-categories"],
    queryFn: () => getRoomCategories({ limit: 100 }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: RoomCategoryCreate) => createRoomCategory(payload),
    onSuccess: () => {
      showSuccess(t.room.categoryCreated)
      queryClient.invalidateQueries({ queryKey: ["room-categories"] })
      setName("")
      setDescription("")
      setErrors({})
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        t.room.failedToCreateCategory,
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRoomCategory(id),
    onSuccess: () => {
      showSuccess(t.room.categoryDeleted)
      queryClient.invalidateQueries({ queryKey: ["room-categories"] })
    },
    onError: (error) => {
      showError(error, t.room.failedToDeleteCategory)
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = t.room.categoryNameRequired
    if (name.trim().length > 100)
      newErrors.name = t.room.categoryNameMaxLength
    if (description && description.length > 500)
      newErrors.description = t.room.categoryDescriptionMaxLength
    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }
    createMutation.mutate({
      name: name.trim(),
      description: description || null,
    })
  }

  const categories: RoomCategoryPublic[] = data?.data || []

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-lg bg-white dark:bg-dark-2 shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t.room.manageCategories}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-500 dark:hover:text-neutral-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Create form */}
            <form onSubmit={handleCreate} className="space-y-3">
              {errors.general && (
                <div className="bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400 px-4 py-3 rounded-lg text-sm">
                  {errors.general}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t.room.categoryName} *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full border ${errors.name ? "border-danger-500 dark:border-danger-400" : "border-neutral-300 dark:border-neutral-500"} rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors`}
                    placeholder={t.room.categoryPlaceholder}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {t.room.categoryDescription}
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`w-full border ${errors.description ? "border-danger-500 dark:border-danger-400" : "border-neutral-300 dark:border-neutral-500"} rounded-lg bg-white dark:bg-transparent px-3 py-2 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors`}
                    placeholder={t.common.optional}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                      {errors.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg px-3 py-2 inline-flex items-center gap-2 transition bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {t.room.addCategory}
              </button>
            </form>

            {/* Category list */}
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                {t.room.existingCategories}
              </h4>
              {isLoading ? (
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t.room.loading}
                </div>
              ) : error ? (
                <div className="text-sm text-danger-600 dark:text-danger-400">
                  {t.room.failedToLoadCategories}
                </div>
              ) : categories.length === 0 ? (
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t.room.noCategoriesYet}
                </div>
              ) : (
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {categories.map((cat) => (
                    <li
                      key={cat.id}
                      className="py-2 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm text-neutral-900 dark:text-white font-medium">
                          {cat.name}
                        </div>
                        {cat.description && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {cat.description}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(cat.id)}
                        className="w-8 h-8 bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400 rounded-full inline-flex items-center justify-center hover:bg-danger-200 dark:hover:bg-danger-600/40 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
