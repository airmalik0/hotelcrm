import { getInquiries, resolveInquiry, updateInquiry } from "@/api/inquiries"
import type {
  CustomerInquiryPublic,
  InquiryStatus,
  InquiryType,
} from "@/client/types.gen"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatDateTime } from "@/utils/formatters"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  AtSign,
  CheckCircle2,
  ExternalLink,
  Filter,
  Lightbulb,
  MessageSquare,
  Phone,
  Search,
  User,
} from "lucide-react"
import type React from "react"
import { useState } from "react"
import toast from "react-hot-toast"
import { Link } from "react-router-dom"

// Status badge colors
const getStatusBadgeColor = (status: InquiryStatus) => {
  switch (status) {
    case "new":
      return "bg-primary-100 dark:bg-primary-600/30 text-primary-600 dark:text-primary-400"
    case "in_progress":
      return "bg-warning-100 dark:bg-warning-600/30 text-warning-600 dark:text-warning-400"
    case "resolved":
      return "bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400"
    case "closed":
      return "bg-neutral-100 dark:bg-neutral-600/30 text-neutral-600 dark:text-neutral-400"
    default:
      return "bg-neutral-100 dark:bg-neutral-600/30 text-neutral-600 dark:text-neutral-400"
  }
}

// Format phone number for display
const formatPhoneNumber = (phone: string | null | undefined) => {
  if (!phone) return null
  // If it starts with +, just return as is
  if (phone.startsWith("+")) return phone
  // Otherwise add + prefix
  return `+${phone}`
}

// Type icon and color
const getTypeIcon = (type: InquiryType) => {
  switch (type) {
    case "complaint":
      return <AlertCircle className="w-4 h-4 text-danger-600" />
    case "suggestion":
      return <Lightbulb className="w-4 h-4 text-warning-600" />
    case "question":
      return <MessageSquare className="w-4 h-4 text-info-600" />
    default:
      return <MessageSquare className="w-4 h-4 text-neutral-600" />
  }
}

export function CustomerInquiries() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<InquiryStatus | "">("")
  const [filterType, setFilterType] = useState<InquiryType | "">("")
  const [customersOnly, setCustomersOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [selectedInquiry, setSelectedInquiry] =
    useState<CustomerInquiryPublic | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")

  const queryClient = useQueryClient()

  // Fetch inquiries
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "inquiries",
      currentPage,
      itemsPerPage,
      searchTerm,
      filterStatus,
      filterType,
      customersOnly,
    ],
    queryFn: () =>
      getInquiries({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
        status: (filterStatus as InquiryStatus) || undefined,
        customers_only: customersOnly || undefined,
      }),
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      inquiryId,
      status,
    }: { inquiryId: string; status: InquiryStatus }) =>
      updateInquiry(inquiryId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] })
      toast.success("Status updated successfully")
      setSelectedInquiry(null)
    },
    onError: () => {
      toast.error("Failed to update status")
    },
  })

  // Resolve inquiry mutation
  const resolveMutation = useMutation({
    mutationFn: ({ inquiryId, notes }: { inquiryId: string; notes: string }) =>
      resolveInquiry(inquiryId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] })
      toast.success("Inquiry resolved successfully")
      setSelectedInquiry(null)
      setResolutionNotes("")
    },
    onError: () => {
      toast.error("Failed to resolve inquiry")
    },
  })

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCurrentPage(0)
  }

  const handleResolve = (inquiryId: string) => {
    if (!resolutionNotes.trim()) {
      toast.error("Please provide resolution notes")
      return
    }
    resolveMutation.mutate({ inquiryId, notes: resolutionNotes })
  }

  const totalPages = data ? Math.ceil(data.count / itemsPerPage) : 0

  // Filter inquiries by search term (client-side)
  const filteredInquiries = data?.data.filter((inquiry) => {
    const matchesSearch =
      !searchTerm ||
      inquiry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.bot_user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = !filterType || inquiry.inquiry_type === filterType

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.pages.inquiries.title}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            {t.pages.inquiries.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-8 h-8 text-primary-600" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-2 rounded-lg shadow-sm dark:shadow-none p-4 border border-neutral-200 dark:border-neutral-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t.pages.inquiries.new}
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                {data?.data.filter((i) => i.status === "new").length || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-600/30 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg shadow-sm dark:shadow-none p-4 border border-neutral-200 dark:border-neutral-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t.pages.inquiries.inProgress}
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                {data?.data.filter((i) => i.status === "in_progress").length ||
                  0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-warning-100 dark:bg-warning-600/30 flex items-center justify-center">
              <User className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg shadow-sm dark:shadow-none p-4 border border-neutral-200 dark:border-neutral-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t.pages.inquiries.resolved}
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                {data?.data.filter((i) => i.status === "resolved").length || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-success-100 dark:bg-success-600/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-2 rounded-lg shadow-sm dark:shadow-none p-4 border border-neutral-200 dark:border-neutral-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t.pages.inquiries.complaints}
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                {data?.data.filter((i) => i.inquiry_type === "complaint")
                  .length || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-danger-100 dark:bg-danger-600/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="border-b border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-6 py-4">
          <div className="flex items-center flex-wrap gap-3 justify-between mb-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search inquiries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </form>

            {/* Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-500 transition-colors text-sm"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-600">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.inquiries.status}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as InquiryStatus | "")
                  }
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-1.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{t.inquiries.allStatuses}</option>
                  <option value="new">{t.inquiries.new}</option>
                  <option value="in_progress">{t.inquiries.inProgress}</option>
                  <option value="resolved">{t.inquiries.resolved}</option>
                  <option value="closed">{t.inquiries.closed}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.inquiries.type}
                </label>
                <select
                  value={filterType}
                  onChange={(e) =>
                    setFilterType(e.target.value as InquiryType | "")
                  }
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-1.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{t.inquiries.allTypes}</option>
                  <option value="complaint">{t.inquiries.complaint}</option>
                  <option value="suggestion">{t.inquiries.suggestion}</option>
                  <option value="question">{t.inquiries.question}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.inquiries.customerFilter}
                </label>
                <div className="flex items-center h-[30px]">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customersOnly}
                      onChange={(e) => {
                        setCustomersOnly(e.target.checked)
                        setCurrentPage(0)
                      }}
                      className="w-4 h-4 text-primary-600 bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-500 rounded focus:ring-primary-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">
                      {t.inquiries.onlyCustomers}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Items per page
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(0)
                  }}
                  className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-3 py-1.5 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t.pages.inquiries.date}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t.pages.inquiries.type}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t.pages.inquiries.contactInfo}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t.pages.inquiries.message}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t.pages.inquiries.status}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {t.pages.inquiries.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-2 divide-y divide-neutral-200 dark:divide-neutral-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-danger-600"
                  >
                    {t.common.failedToLoadInquiries}
                  </td>
                </tr>
              ) : !filteredInquiries || filteredInquiries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400"
                  >
                    {t.common.noInquiriesFound}
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-white">
                      {formatDateTime(inquiry.inquiry_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(inquiry.inquiry_type)}
                        <span className="text-sm capitalize text-neutral-900 dark:text-white">
                          {inquiry.inquiry_type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        {/* Customer info (if linked) */}
                        {inquiry.customer_name && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-success-600" />
                            <span className="font-medium text-neutral-900 dark:text-white">
                              {inquiry.customer_name}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col gap-0.5 text-xs text-neutral-600 dark:text-neutral-400">

                          {/* Telegram username */}
                          {inquiry.telegram_username && (
                            <div className="flex items-center gap-1">
                              <AtSign className="w-3 h-3" />
                              <span>@{inquiry.telegram_username}</span>
                            </div>
                          )}

                          {/* Phone number */}
                          {inquiry.bot_user_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>
                                {formatPhoneNumber(inquiry.bot_user_phone)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300 max-w-md truncate">
                      {inquiry.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(inquiry.status)}`}
                      >
                        {inquiry.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedInquiry(inquiry)}
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-neutral-200 dark:border-neutral-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Showing {currentPage * itemsPerPage + 1} to{" "}
                {Math.min((currentPage + 1) * itemsPerPage, data?.count || 0)}{" "}
                of {data?.count || 0} results
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border border-neutral-300 dark:border-neutral-500 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={currentPage >= totalPages - 1}
                  className="px-3 py-1 border border-neutral-300 dark:border-neutral-500 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-2 rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-neutral-200 dark:border-neutral-600 px-6 py-4">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Inquiry Details
              </h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Type and Status */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getTypeIcon(selectedInquiry.inquiry_type)}
                  <span className="text-sm font-medium capitalize text-neutral-900 dark:text-white">
                    {selectedInquiry.inquiry_type}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedInquiry.status)}`}
                >
                  {selectedInquiry.status.replace("_", " ")}
                </span>
              </div>

              {/* Contact Information */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
                  Contact Information
                </h3>

                {/* If linked to customer - show customer info with telegram */}
                {selectedInquiry.customer_name ? (
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                        <User className="w-4 h-4 text-success-600" />
                        {selectedInquiry.customer_name}
                      </p>

                      {selectedInquiry.telegram_username && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                          <AtSign className="w-3 h-3" />
                          @{selectedInquiry.telegram_username}
                        </p>
                      )}

                      {selectedInquiry.customer_phone && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {formatPhoneNumber(selectedInquiry.customer_phone)}
                        </p>
                      )}
                    </div>

                    {selectedInquiry.customer_id && (
                      <Link
                        to={`/customers/${selectedInquiry.customer_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                      >
                        View Profile
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                ) : (
                  /* If not linked to customer - show bot user info */
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white">
                      {selectedInquiry.bot_user_name || "Unknown"}
                    </p>

                    {selectedInquiry.telegram_username && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                        <AtSign className="w-3 h-3" />
                        @{selectedInquiry.telegram_username}
                      </p>
                    )}

                    {selectedInquiry.bot_user_phone && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {formatPhoneNumber(selectedInquiry.bot_user_phone)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  Inquiry Date
                </p>
                <p className="text-sm text-neutral-900 dark:text-white">
                  {formatDateTime(selectedInquiry.inquiry_date)}
                </p>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                  Message
                </p>
                <p className="text-sm text-neutral-900 dark:text-white whitespace-pre-wrap">
                  {selectedInquiry.message}
                </p>
              </div>

              {/* Resolution Notes */}
              {selectedInquiry.status !== "resolved" &&
              selectedInquiry.status !== "closed" ? (
                <div>
                  <label
                    htmlFor="resolutionNotes"
                    className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Resolution Notes
                  </label>
                  <textarea
                    id="resolutionNotes"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    placeholder="Enter resolution details..."
                    className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ) : (
                selectedInquiry.resolution_notes && (
                  <div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                      Resolution Notes
                    </p>
                    <p className="text-sm text-neutral-900 dark:text-white whitespace-pre-wrap">
                      {selectedInquiry.resolution_notes}
                    </p>
                  </div>
                )
              )}

              {selectedInquiry.resolved_at && (
                <div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
                    {t.pages.inquiries.resolvedAt}
                  </p>
                  <p className="text-sm text-neutral-900 dark:text-white">
                    {formatDateTime(selectedInquiry.resolved_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-neutral-200 dark:border-neutral-600 px-6 py-4 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedInquiry(null)
                  setResolutionNotes("")
                }}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-500 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Close
              </button>

              <div className="flex gap-2">
                {selectedInquiry.status === "new" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateStatusMutation.mutate({
                        inquiryId: selectedInquiry.id,
                        status: "in_progress",
                      })
                    }
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-2 bg-warning-600 text-white rounded-lg text-sm font-medium hover:bg-warning-700 transition-colors disabled:opacity-50"
                  >
                    Start Working
                  </button>
                )}

                {(selectedInquiry.status === "new" ||
                  selectedInquiry.status === "in_progress") && (
                  <button
                    type="button"
                    onClick={() => handleResolve(selectedInquiry.id)}
                    disabled={
                      resolveMutation.isPending || !resolutionNotes.trim()
                    }
                    className="px-4 py-2 bg-success-600 text-white rounded-lg text-sm font-medium hover:bg-success-700 transition-colors disabled:opacity-50"
                  >
                    {resolveMutation.isPending ? "Resolving..." : "Resolve"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
