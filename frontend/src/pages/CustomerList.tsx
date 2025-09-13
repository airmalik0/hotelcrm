import { deleteCustomer, getCustomers } from "@/api/customers"
import type { CustomerPublic } from "@/client/types.gen"
import { CustomerCreateModal } from "@/components/customer/CustomerCreateModal"
import {
  formatCurrency,
  formatDate,
  formatPhoneNumber,
} from "@/utils/formatters"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Edit, Eye, Plus, Search, Trash2 } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { Link } from "react-router-dom"

export function CustomerList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const queryClient = useQueryClient()

  // Fetch customers
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", currentPage, itemsPerPage, searchTerm],
    queryFn: () =>
      getCustomers({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
      }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
    },
  })

  const handleDelete = (customer: CustomerPublic) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`,
      )
    ) {
      deleteMutation.mutate(customer.id)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCurrentPage(0)
  }

  const totalPages = data ? Math.ceil(data.count / itemsPerPage) : 0

  return (
    <>
      <div className="grid grid-cols-12">
        <div className="col-span-12">
          <div className="bg-white dark:bg-dark-2 rounded-lg border border-neutral-600 h-full p-0 rounded-xl border-0 overflow-hidden">
            <div className="border-b border-neutral-200 dark:border-neutral-600 px-4 md:px-6 py-3 bg-white dark:bg-neutral-700 py-4 px-6 flex items-center flex-wrap gap-3 justify-between">
              <div className="flex items-center flex-wrap gap-3">
                <span className="text-base font-medium text-neutral-600 dark:text-neutral-400 mb-0">
                  Show
                </span>
                <select
                  className="border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-600 dark:text-white ps-3 pe-5 py-1.5 text-sm w-auto"
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
                  <option value={100}>100</option>
                </select>
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    className="bg-white dark:bg-neutral-700 h-10 w-64 pl-10 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-500"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                </form>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="rounded-lg py-3 px-6 inline-flex transition bg-primary-600 text-white hover:bg-primary-700 text-sm px-3 py-2.5 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Customer
              </button>
            </div>
            <div className="px-6 py-5 p-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max rounded-lg border-spacing-0 border-separate border border-neutral-200 dark:border-neutral-600 table-auto">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-600">
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        S.L
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Name
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Phone
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        District
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Total Spent
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Bookings
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        Member Since
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
                          colSpan={8}
                          className="text-center py-8 text-neutral-500"
                        >
                          Loading customers...
                        </td>
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-8 text-danger-600"
                        >
                          Error loading customers
                        </td>
                      </tr>
                    )}
                    {data?.data.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-8 text-neutral-500"
                        >
                          No customers found
                        </td>
                      </tr>
                    )}
                    {data?.data.map((customer, index) => (
                      <tr
                        key={customer.id}
                        className="border-b border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      >
                        <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300">
                          {currentPage * itemsPerPage + index + 1}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-600/25 flex items-center justify-center mr-3">
                              <span className="text-primary-600 dark:text-primary-400 font-semibold">
                                {customer.first_name[0]}
                                {customer.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <span className="text-base font-normal text-neutral-900 dark:text-white">
                                {customer.first_name} {customer.last_name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300">
                          {formatPhoneNumber(customer.phone)}
                        </td>
                        <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300">
                          {customer.district || "N/A"}
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-semibold text-success-600 dark:text-success-400">
                            {formatCurrency(customer.total_spent)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="bg-info-100 dark:bg-info-600/25 text-info-600 dark:text-info-400 px-3 py-1 rounded-full text-sm font-medium">
                            {customer.total_bookings}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300">
                          {formatDate(customer.created_at)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2 justify-center">
                            <Link
                              to={`/customers/${customer.id}`}
                              className="w-8 h-8 bg-info-100 dark:bg-info-600/25 hover:bg-info-200 text-info-600 dark:text-info-400 rounded-full inline-flex items-center justify-center"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/customers/${customer.id}/edit`}
                              className="w-8 h-8 bg-success-100 dark:bg-success-600/25 text-success-600 dark:text-success-400 hover:bg-success-200 rounded-full inline-flex items-center justify-center"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(customer)}
                              disabled={deleteMutation.isPending}
                              className="w-8 h-8 bg-danger-100 dark:bg-danger-600/25 hover:bg-danger-200 text-danger-600 dark:text-danger-500 rounded-full inline-flex items-center justify-center disabled:opacity-50"
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
                      data?.count || 0,
                    )}{" "}
                    of {data?.count || 0} entries
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

      {/* Create Customer Modal */}
      {showCreateModal && (
        <CustomerCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            queryClient.invalidateQueries({ queryKey: ["customers"] })
          }}
        />
      )}
    </>
  )
}
