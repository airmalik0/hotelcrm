import { updateUser } from "@/api/users"
import type { UserPublic, UserRole, UserUpdate } from "@/client/types.gen"
import { handleFormError, showSuccess } from "@/utils/error-handling"
import { useMutation } from "@tanstack/react-query"
import { Eye, EyeOff, X } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"

interface UserEditModalProps {
  isOpen: boolean
  user: UserPublic
  onClose: () => void
  onSuccess: () => void
}

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "host", label: "Host" },
]

export function UserEditModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: UserEditModalProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [changePassword, setChangePassword] = useState(false)
  const [formData, setFormData] = useState<UserUpdate>({
    full_name: user.full_name || "",
    role: user.role || "host",
    is_active: user.is_active ?? true,
    is_superuser: user.is_superuser ?? false,
    password: null,
  })

  const [errors, setErrors] = useState<Partial<UserUpdate>>({})

  // Reset form when user changes
  useEffect(() => {
    setFormData({
      full_name: user.full_name || "",
      role: user.role || "host",
      is_active: user.is_active ?? true,
      is_superuser: user.is_superuser ?? false,
      password: null,
    })
    setChangePassword(false)
    setShowPassword(false)
    setErrors({})
  }, [user])

  const updateMutation = useMutation({
    mutationFn: (data: UserUpdate) => updateUser(user.id, data),
    onSuccess: () => {
      showSuccess("User updated successfully!")
      onSuccess()
      resetForm()
    },
    onError: (error) => {
      handleFormError(
        error,
        (validationErrors) => setErrors(validationErrors),
        "Failed to update user",
      )
    },
  })

  const resetForm = () => {
    setFormData({
      full_name: user.full_name || "",
      role: user.role || "host",
      is_active: user.is_active ?? true,
      is_superuser: user.is_superuser ?? false,
      password: null,
    })
    setErrors({})
    setShowPassword(false)
    setChangePassword(false)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Clear error for this field
    if (errors[name as keyof UserUpdate]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<UserUpdate> = {}

    if (changePassword && formData.password) {
      if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      // Prepare update data - only include password if it's being changed
      const updateData: UserUpdate = {
        full_name: formData.full_name,
        role: formData.role,
        is_active: formData.is_active,
        is_superuser: formData.is_superuser,
      }

      if (changePassword && formData.password) {
        updateData.password = formData.password
      }

      updateMutation.mutate(updateData)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        <div className="relative transform overflow-hidden rounded-xl bg-white dark:bg-dark-2 shadow-xl transition-all sm:w-full sm:max-w-lg">
          <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Edit User: {user.username}
              </h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Username (readonly) */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={user.username}
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Username cannot be changed
                </p>
              </div>

              {/* Change Password Toggle */}
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="changePassword"
                    checked={changePassword}
                    onChange={(e) => {
                      setChangePassword(e.target.checked)
                      if (!e.target.checked) {
                        setFormData((prev) => ({ ...prev, password: null }))
                      }
                    }}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="changePassword"
                    className="ml-3 text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Change password
                  </label>
                </div>

                {changePassword && (
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password || ""}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 pr-10 rounded-lg border ${
                        errors.password
                          ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500"
                          : "border-neutral-300 dark:border-neutral-600 focus:border-primary-500 focus:ring-primary-500"
                      } bg-white dark:bg-transparent dark:text-white focus:ring-2 focus:outline-none transition-colors`}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                    {errors.password && (
                      <p className="mt-1 text-sm text-danger-600">
                        {errors.password}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-transparent dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-colors"
                  placeholder="Enter full name"
                />
              </div>

              {/* Role */}
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
                >
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-transparent dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-colors"
                >
                  {roleOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="dark:bg-neutral-700"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                {formData.role !== user.role && (
                  <p className="mt-1 text-sm text-warning-600">
                    Warning: Changing role will affect user permissions
                  </p>
                )}
              </div>

              {/* Status and Permissions */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-3 text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Active account
                  </label>
                </div>
                {!formData.is_active &&
                  formData.is_active !== user.is_active && (
                    <p className="ml-7 text-sm text-warning-600">
                      Warning: Deactivating will prevent user from logging in
                    </p>
                  )}

                {formData.role === "admin" && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_superuser"
                      name="is_superuser"
                      checked={formData.is_superuser}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label
                      htmlFor="is_superuser"
                      className="ml-3 text-sm font-medium text-neutral-700 dark:text-neutral-300"
                    >
                      Superuser privileges
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
