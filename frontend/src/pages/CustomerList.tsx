import { deleteCustomer, getCustomers } from "@/api/customers"
import type { CustomerPublic } from "@/client/types.gen"
import { CreateCustomerModal } from "@/components/customers/CreateCustomerModal"
import { useLanguage } from "@/contexts/LanguageContext"
import { useConfirm } from "@/hooks/useConfirm"
import { showError, showSuccess } from "@/utils/error-handling"
import {
  formatCurrency,
  formatDate,
  formatPhoneNumber,
} from "@/utils/formatters"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  Edit,
  Eye,
  FileCheck,
  Filter,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

export function CustomerList() {
  const { currency, t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  // Initialize from URL params
  const pageFromUrl = Number.parseInt(searchParams.get("page") || "1", 10)
  const limitFromUrl = Number.parseInt(searchParams.get("limit") || "10", 10)
  const searchFromUrl = searchParams.get("search") || ""

  const [currentPage, setCurrentPage] = useState(Math.max(0, pageFromUrl - 1))
  const [itemsPerPage, setItemsPerPage] = useState(
    [5, 10, 20, 50, 100].includes(limitFromUrl) ? limitFromUrl : 10,
  )
  const [searchTerm, setSearchTerm] = useState(searchFromUrl)

  // Filter and sort states
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "")
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "")
  const [minSpent, setMinSpent] = useState(searchParams.get("min_spent") || "")
  const [maxSpent, setMaxSpent] = useState(searchParams.get("max_spent") || "")
  const [minBookings, setMinBookings] = useState(
    searchParams.get("min_bookings") || "",
  )
  const [maxBookings, setMaxBookings] = useState(
    searchParams.get("max_bookings") || "",
  )
  const [countryCode, setCountryCode] = useState(
    searchParams.get("country_code") || "",
  )
  const [region, setRegion] = useState(searchParams.get("region") || "")
  const [district, setDistrict] = useState(searchParams.get("district") || "")
  const [orderBy, setOrderBy] = useState(
    searchParams.get("order_by") || "created_at",
  )
  const [orderDirection, setOrderDirection] = useState(
    searchParams.get("order_direction") || "desc",
  )

  // Sync state from URL params when they change externally
  useEffect(() => {
    const pageFromUrl = Number.parseInt(searchParams.get("page") || "1", 10)
    const limitFromUrl = Number.parseInt(searchParams.get("limit") || "10", 10)
    const searchFromUrl = searchParams.get("search") || ""

    const newPage = Math.max(0, pageFromUrl - 1)
    const newLimit = [5, 10, 20, 50, 100].includes(limitFromUrl)
      ? limitFromUrl
      : 10

    if (newPage !== currentPage) {
      setCurrentPage(newPage)
    }
    if (newLimit !== itemsPerPage) {
      setItemsPerPage(newLimit)
    }
    if (searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl)
    }

    // Sync filter states
    const newDateFrom = searchParams.get("date_from") || ""
    const newDateTo = searchParams.get("date_to") || ""
    const newMinSpent = searchParams.get("min_spent") || ""
    const newMaxSpent = searchParams.get("max_spent") || ""
    const newMinBookings = searchParams.get("min_bookings") || ""
    const newMaxBookings = searchParams.get("max_bookings") || ""
    const newCountryCode = searchParams.get("country_code") || ""
    const newRegion = searchParams.get("region") || ""
    const newDistrict = searchParams.get("district") || ""
    const newOrderBy = searchParams.get("order_by") || "created_at"
    const newOrderDirection = searchParams.get("order_direction") || "desc"

    if (newDateFrom !== dateFrom) setDateFrom(newDateFrom)
    if (newDateTo !== dateTo) setDateTo(newDateTo)
    if (newMinSpent !== minSpent) setMinSpent(newMinSpent)
    if (newMaxSpent !== maxSpent) setMaxSpent(newMaxSpent)
    if (newMinBookings !== minBookings) setMinBookings(newMinBookings)
    if (newMaxBookings !== maxBookings) setMaxBookings(newMaxBookings)
    if (newCountryCode !== countryCode) setCountryCode(newCountryCode)
    if (newRegion !== region) setRegion(newRegion)
    if (newDistrict !== district) setDistrict(newDistrict)
    if (newOrderBy !== orderBy) setOrderBy(newOrderBy)
    if (newOrderDirection !== orderDirection)
      setOrderDirection(newOrderDirection)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Update URL when pagination/search/filters change (only if different from URL)
  useEffect(() => {
    const currentPageParam = Number.parseInt(
      searchParams.get("page") || "1",
      10,
    )
    const currentLimitParam = Number.parseInt(
      searchParams.get("limit") || "10",
      10,
    )
    const currentSearchParam = searchParams.get("search") || ""
    const currentDateFromParam = searchParams.get("date_from") || ""
    const currentDateToParam = searchParams.get("date_to") || ""
    const currentMinSpentParam = searchParams.get("min_spent") || ""
    const currentMaxSpentParam = searchParams.get("max_spent") || ""
    const currentMinBookingsParam = searchParams.get("min_bookings") || ""
    const currentMaxBookingsParam = searchParams.get("max_bookings") || ""
    const currentCountryCodeParam = searchParams.get("country_code") || ""
    const currentRegionParam = searchParams.get("region") || ""
    const currentDistrictParam = searchParams.get("district") || ""
    const currentOrderByParam = searchParams.get("order_by") || "created_at"
    const currentOrderDirectionParam =
      searchParams.get("order_direction") || "desc"

    const urlPage = currentPage + 1
    const urlLimit = itemsPerPage
    const urlSearch = searchTerm
    const urlDateFrom = dateFrom
    const urlDateTo = dateTo
    const urlMinSpent = minSpent
    const urlMaxSpent = maxSpent
    const urlMinBookings = minBookings
    const urlMaxBookings = maxBookings
    const urlCountryCode = countryCode
    const urlRegion = region
    const urlDistrict = district
    const urlOrderBy = orderBy
    const urlOrderDirection = orderDirection

    // Only update if different from current URL params
    if (
      currentPageParam !== urlPage ||
      currentLimitParam !== urlLimit ||
      currentSearchParam !== urlSearch ||
      currentDateFromParam !== urlDateFrom ||
      currentDateToParam !== urlDateTo ||
      currentMinSpentParam !== urlMinSpent ||
      currentMaxSpentParam !== urlMaxSpent ||
      currentMinBookingsParam !== urlMinBookings ||
      currentMaxBookingsParam !== urlMaxBookings ||
      currentCountryCodeParam !== urlCountryCode ||
      currentRegionParam !== urlRegion ||
      currentDistrictParam !== urlDistrict ||
      currentOrderByParam !== urlOrderBy ||
      currentOrderDirectionParam !== urlOrderDirection
    ) {
      const params = new URLSearchParams()
      if (urlPage > 1) {
        params.set("page", String(urlPage))
      }
      if (urlLimit !== 10) {
        params.set("limit", String(urlLimit))
      }
      if (urlSearch) {
        params.set("search", urlSearch)
      }
      if (urlDateFrom) {
        params.set("date_from", urlDateFrom)
      }
      if (urlDateTo) {
        params.set("date_to", urlDateTo)
      }
      if (urlMinSpent) {
        params.set("min_spent", urlMinSpent)
      }
      if (urlMaxSpent) {
        params.set("max_spent", urlMaxSpent)
      }
      if (urlMinBookings) {
        params.set("min_bookings", urlMinBookings)
      }
      if (urlMaxBookings) {
        params.set("max_bookings", urlMaxBookings)
      }
      if (urlCountryCode) {
        params.set("country_code", urlCountryCode)
      }
      if (urlRegion) {
        params.set("region", urlRegion)
      }
      if (urlDistrict) {
        params.set("district", urlDistrict)
      }
      if (urlOrderBy !== "created_at") {
        params.set("order_by", urlOrderBy)
      }
      if (urlOrderDirection !== "desc") {
        params.set("order_direction", urlOrderDirection)
      }
      setSearchParams(params, { replace: true })
    }
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    dateFrom,
    dateTo,
    minSpent,
    maxSpent,
    minBookings,
    maxBookings,
    countryCode,
    region,
    district,
    orderBy,
    orderDirection,
    searchParams,
    setSearchParams,
  ])

  // Fetch customers
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "customers",
      currentPage,
      itemsPerPage,
      searchTerm,
      dateFrom,
      dateTo,
      minSpent,
      maxSpent,
      minBookings,
      maxBookings,
      countryCode,
      region,
      district,
      orderBy,
      orderDirection,
    ],
    queryFn: () =>
      getCustomers({
        skip: currentPage * itemsPerPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        min_spent: minSpent ? Number.parseFloat(minSpent) : undefined,
        max_spent: maxSpent ? Number.parseFloat(maxSpent) : undefined,
        min_bookings: minBookings ? Number.parseInt(minBookings) : undefined,
        max_bookings: maxBookings ? Number.parseInt(maxBookings) : undefined,
        country_code: countryCode || undefined,
        region: region || undefined,
        district: district || undefined,
        order_by: orderBy,
        order_direction: orderDirection,
      }),
  })

  // Redirect to last page if current page exceeds available pages
  useEffect(() => {
    if (data && data.count > 0) {
      const totalPages = Math.ceil(data.count / itemsPerPage)
      const maxPage = Math.max(0, totalPages - 1)

      if (currentPage > maxPage) {
        setCurrentPage(maxPage)
      }
    }
  }, [data, currentPage, itemsPerPage])

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      showSuccess(t.customer.deletedSuccess)
    },
    onError: (error) => {
      showError(error, t.customer.deleteError)
    },
  })

  const handleDelete = async (customer: CustomerPublic) => {
    const confirmed = await confirm({
      title: t.customer.deleteTitle,
      message: t.customer.deleteMessage
        .replace("{firstName}", customer.first_name)
        .replace("{lastName}", customer.last_name),
      confirmText: t.customer.deleteConfirm,
      variant: "danger",
    })

    if (confirmed) {
      deleteMutation.mutate(customer.id)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCurrentPage(0)
  }

  const applyFilters = () => {
    setCurrentPage(0)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setMinSpent("")
    setMaxSpent("")
    setMinBookings("")
    setMaxBookings("")
    setCountryCode("")
    setRegion("")
    setDistrict("")
    setOrderBy("created_at")
    setOrderDirection("desc")
    setCurrentPage(0)
  }

  const hasActiveFilters = () => {
    return !!(
      dateFrom ||
      dateTo ||
      minSpent ||
      maxSpent ||
      minBookings ||
      maxBookings ||
      countryCode ||
      region ||
      district ||
      orderBy !== "created_at" ||
      orderDirection !== "desc"
    )
  }

  const totalPages = data ? Math.ceil(data.count / itemsPerPage) : 0

  return (
    <>
      <div className="grid grid-cols-12">
        <div className="col-span-12">
          <div className="bg-white dark:bg-dark-2 rounded-xl shadow-sm dark:shadow-none h-full overflow-hidden">
            <div className="border-b border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-6 py-4 flex items-center flex-wrap gap-3 justify-between">
              <div className="flex items-center flex-wrap gap-3">
                <span className="text-base font-medium text-neutral-600 dark:text-neutral-400 mb-0">
                  {t.customer.show}
                </span>
                <select
                  className="border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white ps-3 pe-5 py-1.5 text-sm w-auto focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
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
                    className="bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white h-10 w-64 pl-10 pr-4 rounded-lg border border-neutral-200 dark:border-neutral-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                    placeholder={t.customer.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                </form>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`rounded-lg px-4 py-2.5 inline-flex items-center gap-2 transition text-sm font-medium shadow-sm hover:shadow-md ${
                    hasActiveFilters()
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-300 dark:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-600"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {t.customer.filters}
                  {hasActiveFilters() && (
                    <span className="bg-danger-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      !
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="rounded-lg px-4 py-2.5 inline-flex items-center gap-2 transition bg-primary-600 text-white hover:bg-primary-700 text-sm font-medium shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  {t.customer.addNew}
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="border-b border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t.customer.dateRange}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="flex-1 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                        placeholder={t.customer.dateFrom}
                      />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="flex-1 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                        placeholder={t.customer.dateTo}
                      />
                    </div>
                  </div>

                  {/* Spending Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t.customer.spendingRange}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={minSpent}
                        onChange={(e) => setMinSpent(e.target.value)}
                        className="flex-1 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                        placeholder={t.customer.minSpent}
                        min="0"
                        step="0.01"
                      />
                      <input
                        type="number"
                        value={maxSpent}
                        onChange={(e) => setMaxSpent(e.target.value)}
                        className="flex-1 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                        placeholder={t.customer.maxSpent}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Bookings Range */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t.customer.bookingsRange}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={minBookings}
                        onChange={(e) => setMinBookings(e.target.value)}
                        className="flex-1 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                        placeholder={t.customer.minBookings}
                        min="0"
                      />
                      <input
                        type="number"
                        value={maxBookings}
                        onChange={(e) => setMaxBookings(e.target.value)}
                        className="flex-1 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                        placeholder={t.customer.maxBookings}
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t.customer.location}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={countryCode}
                        onChange={(e) =>
                          setCountryCode(e.target.value.toUpperCase())
                        }
                        className="flex-1 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                        placeholder={t.customer.country}
                        maxLength={2}
                      />
                      <input
                        type="text"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="flex-1 border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                        placeholder={t.customer.region}
                      />
                    </div>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                      placeholder={t.customer.district}
                    />
                  </div>

                  {/* Sorting */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t.customer.sortBy}
                    </label>
                    <select
                      value={orderBy}
                      onChange={(e) => setOrderBy(e.target.value)}
                      className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                    >
                      <option value="created_at">
                        {t.customer.sortByDate}
                      </option>
                      <option value="first_name">
                        {t.customer.sortByName}
                      </option>
                      <option value="total_spent">
                        {t.customer.sortBySpent}
                      </option>
                      <option value="total_bookings">
                        {t.customer.sortByBookings}
                      </option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {t.customer.sortOrder}
                    </label>
                    <select
                      value={orderDirection}
                      onChange={(e) => setOrderDirection(e.target.value)}
                      className="w-full border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600 transition-colors"
                    >
                      <option value="desc">{t.customer.descending}</option>
                      <option value="asc">{t.customer.ascending}</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-end gap-2">
                    <button
                      onClick={applyFilters}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
                    >
                      {t.customer.applyFilters}
                    </button>
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-500 text-sm font-medium transition-colors"
                    >
                      {t.customer.clearFilters}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-max rounded-lg border-spacing-0 border-separate border border-neutral-200 dark:border-neutral-600">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-600">
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        {t.customer.serialNumber}
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        {t.customer.name}
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        {t.customer.phone}
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        {t.customer.location}
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        {t.customer.totalSpent}
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        {t.customer.bookings}
                      </th>
                      <th className="text-left py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        {t.customer.memberSince}
                      </th>
                      <th className="text-center py-3 px-2 font-semibold text-neutral-900 dark:text-white">
                        {t.customer.action}
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
                          {t.customer.loading}
                        </td>
                      </tr>
                    )}
                    {error && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-8 text-danger-600"
                        >
                          {t.customer.loadingError}
                        </td>
                      </tr>
                    )}
                    {data?.data.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center py-8 text-neutral-500"
                        >
                          {t.common.noCustomersFound}
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
                          <div className="flex items-center gap-2">
                            <span className="text-base font-normal text-neutral-900 dark:text-white">
                              {customer.first_name} {customer.last_name}
                            </span>
                            {customer.passport_photo_path && (
                              <FileCheck
                                className="w-4 h-4 text-success-600 dark:text-success-400"
                                title={t.customer.passportUploaded}
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300">
                          {formatPhoneNumber(customer.phone)}
                        </td>
                        <td className="py-3 px-2 text-neutral-600 dark:text-neutral-300">
                          {(() => {
                            const parts: string[] = []
                            if (customer.country_code)
                              parts.push(customer.country_code)
                            if (customer.region) parts.push(customer.region)
                            if (customer.district) parts.push(customer.district)
                            return parts.length
                              ? parts.join(" · ")
                              : t.customer.notAvailable
                          })()}
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-semibold text-success-600 dark:text-success-400">
                            {formatCurrency(customer.total_spent, currency)}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="bg-info-100 dark:bg-info-600/30 text-info-600 dark:text-info-400 px-3 py-1 rounded-full text-sm font-medium">
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
                              onClick={() => {
                                // Save current pagination and filter state to localStorage
                                const customerListState = {
                                  page: currentPage + 1,
                                  limit: itemsPerPage,
                                  search: searchTerm,
                                  date_from: dateFrom,
                                  date_to: dateTo,
                                  min_spent: minSpent,
                                  max_spent: maxSpent,
                                  min_bookings: minBookings,
                                  max_bookings: maxBookings,
                                  country_code: countryCode,
                                  region: region,
                                  district: district,
                                  order_by: orderBy,
                                  order_direction: orderDirection,
                                }
                                localStorage.setItem('customerListState', JSON.stringify(customerListState))
                              }}
                              className="w-8 h-8 bg-info-100 dark:bg-info-600/30 hover:bg-info-200 text-info-600 dark:text-info-400 rounded-full inline-flex items-center justify-center"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/customers/${customer.id}/edit`}
                              className="w-8 h-8 bg-success-100 dark:bg-success-600/30 text-success-600 dark:text-success-400 hover:bg-success-200 rounded-full inline-flex items-center justify-center"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(customer)}
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
                    {t.customer.paginationShowing
                      .replace("{from}", String(currentPage * itemsPerPage + 1))
                      .replace(
                        "{to}",
                        String(
                          Math.min(
                            (currentPage + 1) * itemsPerPage,
                            data?.count || 0,
                          ),
                        ),
                      )
                      .replace("{total}", String(data?.count || 0))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 0}
                      className="px-3 py-1 rounded border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t.common.previous}
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
                              : "border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          }`}
                        >
                          {page + 1}
                        </button>
                      )
                    }).filter(Boolean)}
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages - 1}
                      className="px-3 py-1 rounded border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t.common.next}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          // queryClient.invalidateQueries is already called inside CreateCustomerModal
        }}
      />
      {ConfirmDialog}
    </>
  )
}
