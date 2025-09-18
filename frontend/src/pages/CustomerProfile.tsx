import { getCustomer } from "@/api/customers"
import { BookingHistoryTab } from "@/components/customer/BookingHistoryTab"
import { CustomerEditForm } from "@/components/customer/CustomerEditForm"
import { useQuery } from "@tanstack/react-query"
import {
  Calendar,
  DollarSign,
  Edit,
  FileText,
  MapPin,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react"
import { useState } from "react"
import { useParams } from "react-router-dom"

export function CustomerProfile() {
  const { customerId } = useParams<{ customerId: string }>()
  const [activeTab, setActiveTab] = useState<"details" | "bookings" | "edit">(
    "details",
  )

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(customerId!),
    enabled: !!customerId,
  })

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString()
  }

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 dark:bg-blue-600/25 text-blue-600 dark:text-blue-400"
      case "checked_in":
        return "bg-green-100 dark:bg-green-600/25 text-green-600 dark:text-green-400"
      case "checked_out":
        return "bg-gray-100 dark:bg-gray-600/25 text-gray-600 dark:text-gray-400"
      case "cancelled":
        return "bg-red-100 dark:bg-red-600/25 text-red-600 dark:text-red-400"
      default:
        return "bg-neutral-100 dark:bg-neutral-600/25 text-neutral-600 dark:text-neutral-400"
    }
  }

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-500">Loading customer data...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-danger-600">Customer not found</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column - Customer Info */}
      <div className="col-span-12 lg:col-span-4">
        <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-dark-2 h-full shadow-sm dark:shadow-none">
          <div className="bg-gradient-to-r from-primary-600 to-primary-400 h-32" />
          <div className="pb-6 px-6 -mt-16">
            <div className="text-center border-b border-neutral-200 dark:border-neutral-600 pb-6">
              <div className="w-32 h-32 rounded-full bg-white dark:bg-neutral-800 border-4 border-white dark:border-neutral-700 mx-auto flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                  {customer.first_name[0]}
                  {customer.last_name[0]}
                </span>
              </div>
              <h4 className="text-xl font-semibold mt-4 mb-1 text-neutral-900 dark:text-white">
                {customer.first_name} {customer.last_name}
              </h4>
              <span className="text-neutral-600 dark:text-neutral-400">
                Customer ID: {customer.id.slice(0, 8)}
              </span>
            </div>

            {/* Personal Info */}
            <div className="mt-6">
              <h6 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
                Personal Information
              </h6>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <User className="w-5 h-5 text-neutral-500" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {customer.first_name} {customer.last_name}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-neutral-500" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {customer.phone || "No phone number"}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-neutral-500" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    DOB: {formatDate(customer.date_of_birth)}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-neutral-500" />
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {customer.district || "No location"}
                  </span>
                </li>
                {customer.notes && (
                  <li className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-neutral-500 mt-0.5" />
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {customer.notes}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Statistics */}
            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-600">
              <h6 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
                Statistics
              </h6>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-success-100 dark:bg-success-600/25 rounded-lg p-4">
                  <DollarSign className="w-8 h-8 text-success-600 dark:text-success-400 mb-2" />
                  <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                    {formatCurrency(customer.total_spent)}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Total Spent
                  </p>
                </div>
                <div className="bg-info-100 dark:bg-info-600/25 rounded-lg p-4">
                  <ShoppingBag className="w-8 h-8 text-info-600 dark:text-info-400 mb-2" />
                  <p className="text-2xl font-bold text-info-600 dark:text-info-400">
                    {customer.total_bookings}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Total Bookings
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-semibold">Member Since:</span>{" "}
                  {formatDate(customer.created_at)}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-semibold">First Booking:</span>{" "}
                  {formatDate(customer.first_booking_date)}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-semibold">Last Booking:</span>{" "}
                  {formatDate(customer.last_booking_date)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Tabs */}
      <div className="col-span-12 lg:col-span-8">
        <div className="bg-white dark:bg-dark-2 rounded-xl h-full shadow-sm dark:shadow-none">
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap border-b border-neutral-200 dark:border-neutral-600 mb-6">
              <button
                className={`py-2.5 px-4 border-b-2 font-semibold text-base inline-flex items-center gap-2 transition-colors ${
                  activeTab === "details"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900 dark:hover:text-white"
                }`}
                onClick={() => setActiveTab("details")}
              >
                <User className="w-4 h-4" />
                Customer Details
              </button>
              <button
                className={`py-2.5 px-4 border-b-2 font-semibold text-base inline-flex items-center gap-2 transition-colors ${
                  activeTab === "bookings"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900 dark:hover:text-white"
                }`}
                onClick={() => setActiveTab("bookings")}
              >
                <Calendar className="w-4 h-4" />
                Booking History
              </button>
              <button
                className={`py-2.5 px-4 border-b-2 font-semibold text-base inline-flex items-center gap-2 transition-colors ${
                  activeTab === "edit"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-neutral-600 hover:text-neutral-900 dark:hover:text-white"
                }`}
                onClick={() => setActiveTab("edit")}
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            </div>

            {/* Tab Content */}
            <div>
              {/* Details Tab */}
              {activeTab === "details" && (
                <div>
                  <h5 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">
                    Customer Information
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Full Name
                      </label>
                      <p className="text-base text-neutral-900 dark:text-white">
                        {customer.first_name} {customer.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Phone Number
                      </label>
                      <p className="text-base text-neutral-900 dark:text-white">
                        {customer.phone || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Date of Birth
                      </label>
                      <p className="text-base text-neutral-900 dark:text-white">
                        {formatDate(customer.date_of_birth)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        District/Location
                      </label>
                      <p className="text-base text-neutral-900 dark:text-white">
                        {customer.district || "Not provided"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Notes
                      </label>
                      <p className="text-base text-neutral-900 dark:text-white">
                        {customer.notes || "No notes available"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <h6 className="text-base font-semibold mb-3 text-neutral-900 dark:text-white">
                      Customer Metrics
                    </h6>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Total Spent
                        </p>
                        <p className="text-lg font-bold text-success-600 dark:text-success-400">
                          {formatCurrency(customer.total_spent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Total Bookings
                        </p>
                        <p className="text-lg font-bold text-info-600 dark:text-info-400">
                          {customer.total_bookings}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Avg. Spending
                        </p>
                        <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          {customer.total_bookings > 0
                            ? formatCurrency(
                                customer.total_spent / customer.total_bookings,
                              )
                            : "$0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Customer Since
                        </p>
                        <p className="text-lg font-bold text-neutral-900 dark:text-white">
                          {new Date(customer.created_at).getFullYear()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bookings Tab */}
              {activeTab === "bookings" && customerId && (
                <BookingHistoryTab customerId={customerId} />
              )}

              {/* Edit Tab */}
              {activeTab === "edit" && <CustomerEditForm customer={customer} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
