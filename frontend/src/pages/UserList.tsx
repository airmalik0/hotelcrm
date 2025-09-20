import { deleteUser, getUsers } from "@/api/users"
import type { UserPublic, UserRole } from "@/client/types.gen"
import { UserCreateModal } from "@/components/user/UserCreateModal"
import { UserEditModal } from "@/components/user/UserEditModal"
import { useConfirm } from "@/hooks/useConfirm"
import { showError, showSuccess } from "@/utils/error-handling"
import { formatDate } from "@/utils/formatters"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Edit,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
  UserCheck,
} from "lucide-react"
import type React from "react"
import { useState } from "react"

// Role badge colors
const roleBadgeColors: Record<UserRole, string> = {
  admin:
    "bg-danger-100 dark:bg-danger-600/30 text-danger-600 dark:text-danger-400",
  manager: "bg-info-100 dark:bg-info-600/30 text-info-600 dark:text-info-400",
  host: "bg-warning-100 dark:bg-warning-600/30 text-warning-600 dark:text-warning-400",
}

// Role display names
const roleDisplayNames: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  host: "Host",
}

export function UserList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserPublic | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  // Fetch users
  const { data, isLoading, error } = useQuery({
    queryKey: ["users", currentPage, itemsPerPage],
    queryFn: () =>
      getUsers({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
      }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      showSuccess("User deleted successfully!")
    },
    onError: (error) => {
      showError(error, "Failed to delete user. Please try again.")
    },
  })

  // Filter users based on search term
  const filteredUsers = data?.data.filter((user) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.username.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    )
  })

  const handleDelete = async (user: UserPublic) => {
    const confirmed = await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    })

    if (confirmed) {
      deleteMutation.mutate(user.id)
    }
  }

  const handleEdit = (user: UserPublic) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCurrentPage(0)
  }

  const totalPages = filteredUsers
    ? Math.ceil(filteredUsers.length / itemsPerPage)
    : 0
  const paginatedUsers = filteredUsers?.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  )

  return (
    <>
      <div className="grid grid-cols-12">
        <div className="col-span-12">
          <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm dark:shadow-none h-full overflow-hidden">
            <div className="border-b border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-6 py-4 flex items-center flex-wrap gap-3 justify-between">
              <div className="flex items-center flex-wrap gap-3">
                <span className="text-base font-medium text-neutral-600 dark:text-neutral-400 mb-0">
                  Show
                </span>
                <select
                  className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 dark:text-white ps-3 pe-5 py-1.5 text-sm w-auto focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(0)
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    className="bg-white dark:bg-neutral-700 h-10 w-64 pl-10 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                </form>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg px-4 py-2.5 inline-flex items-center gap-2 transition bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add New User
              </button>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max rounded-lg border-spacing-0 border-separate border border-neutral-200 dark:border-neutral-600">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-600">
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        S.L
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Username
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Full Name
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Role
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Status
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Permissions
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-neutral-500"
                        >
                          Loading users...
                        </td>
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-danger-600"
                        >
                          Error loading users
                        </td>
                      </tr>
                    )}
                    {paginatedUsers?.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-neutral-500"
                        >
                          No users found
                        </td>
                      </tr>
                    )}
                    {paginatedUsers?.map((user, index) => (
                      <tr
                        key={user.id}
                        className="border-b border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300">
                          {currentPage * itemsPerPage + index + 1}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-600/30 flex items-center justify-center mr-3">
                              <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <span className="text-base font-normal text-neutral-900 dark:text-white">
                              {user.username}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300">
                          {user.full_name || "—"}
                        </td>
                        <td className="py-3 px-2">
                          {user.role && (
                            <span
                              className={`${roleBadgeColors[user.role]} px-3 py-1 rounded-full text-sm font-medium`}
                            >
                              {roleDisplayNames[user.role]}
                            </span>
                          )}
                        </td>
                        <td className="text-center py-3 px-2">
                          {user.is_active ? (
                            <span className="bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400 border border-success-200 dark:border-success-600/50 px-3 py-1 rounded-full text-sm font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="bg-neutral-100 dark:bg-neutral-600/30 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600/50 px-3 py-1 rounded-full text-sm font-medium">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="text-center py-3 px-2">
                          <div className="flex justify-center gap-2">
                            {user.is_superuser && (
                              <span
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-600/30"
                                title="Superuser"
                              >
                                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              </span>
                            )}
                            {!user.is_superuser && user.role === "admin" && (
                              <span
                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-danger-100 dark:bg-danger-600/30"
                                title="Admin"
                              >
                                <UserCheck className="w-4 h-4 text-danger-600 dark:text-danger-400" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => handleEdit(user)}
                              className="w-8 h-8 bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400 hover:bg-success-200 rounded-full inline-flex items-center justify-center"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={deleteMutation.isPending}
                              className="w-8 h-8 bg-danger-100 dark:bg-danger-600/30 hover:bg-danger-200 text-danger-600 dark:text-danger-500 rounded-full inline-flex items-center justify-center disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Showing {currentPage * itemsPerPage + 1} to{" "}
                    {Math.min(
                      (currentPage + 1) * itemsPerPage,
                      filteredUsers?.length || 0,
                    )}{" "}
                    of {filteredUsers?.length || 0} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 0}
                      className="px-3 py-1 rounded border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = currentPage - 2 + i
                      if (page < 0 || page >= totalPages) return null
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded ${
                            currentPage === page
                              ? "bg-primary-600 text-white"
                              : "border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          {page + 1}
                        </button>
                      )
                    }).filter(Boolean)}
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages - 1}
                      className="px-3 py-1 rounded border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <UserCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ["users"] })
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <UserEditModal
          isOpen={showEditModal}
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedUser(null)
            queryClient.invalidateQueries({ queryKey: ["users"] })
          }}
        />
      )}
      {ConfirmDialog}
    </>
  )
}
