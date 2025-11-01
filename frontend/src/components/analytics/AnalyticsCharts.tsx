import { useLanguage } from "@/contexts/LanguageContext"
import { currencySymbols } from "@/i18n"
import { formatCurrency } from "@/utils/formatters"
import { format } from "date-fns"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// Color palette consistent with backend charts
const COLORS = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#F59E0B",
  danger: "#EF4444",
  purple: "#8B5CF6",
  pink: "#EC4899",
}

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  COLORS.danger,
  COLORS.purple,
  COLORS.pink,
]

// DashboardMetrics type from Analytics page
type DashboardMetrics = {
  revenue_trend?: Array<{ date: string; value: number }>
  category_breakdown?: Array<{ name: string; revenue: number; bookings: number }>
  payment_distribution?: Array<{ name: string; value: number; amount: number }>
  customer_metrics?: any
  [key: string]: any
}

interface ChartProps {
  metrics: DashboardMetrics
}

// Custom tooltip for currency formatting
const CurrencyTooltipContent = ({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: any[]
  label?: string
  currency: string
}) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-white dark:bg-dark-2 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-600">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm mt-1" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value, currency as any)}
        </p>
      ))}
    </div>
  )
}

// Wrapper component that gets currency from context
const CurrencyTooltip = (props: any) => {
  const { currency } = useLanguage()
  return <CurrencyTooltipContent {...props} currency={currency} />
}

// Custom tooltip for percentage (unused)
// const PercentageTooltip = ({ active, payload, label }: any) => {
//   if (!active || !payload || !payload.length) return null
//   return (
//     <div className="bg-white dark:bg-dark-2 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-600">
//       <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
//         {label}
//       </p>
//       {payload.map((entry: any, index: number) => (
//         <p key={index} className="text-sm mt-1" style={{ color: entry.color }}>
//           {entry.name}: {entry.value.toFixed(1)}%
//         </p>
//       ))}
//     </div>
//   )
// }

// Custom tooltip for payment distribution (percentage + amount)
const PaymentDistributionTooltipContent = ({
  active,
  payload,
  currency,
}: {
  active?: boolean
  payload?: any[]
  currency: string
}) => {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-white dark:bg-dark-2 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-600">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
        {data.name}
      </p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Percentage:{" "}
        <span className="font-semibold">{data.value.toFixed(1)}%</span>
      </p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Amount:{" "}
        <span className="font-semibold">
          {formatCurrency(data.amount, currency as any)}
        </span>
      </p>
    </div>
  )
}

// Wrapper component that gets currency from context
const PaymentDistributionTooltip = (props: any) => {
  const { currency } = useLanguage()
  return <PaymentDistributionTooltipContent {...props} currency={currency} />
}

export function RevenueTrendChart({ metrics }: ChartProps) {
  const { currency, t } = useLanguage()
  if (!metrics.revenue_trend || metrics.revenue_trend.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        {t.pages.analytics.noRevenueTrend}
      </div>
    )
  }

  const data = metrics.revenue_trend.map((point: { date: string; value: number }) => ({
    date: format(new Date(point.date), "MMM dd"),
    revenue: point.value,
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
          <XAxis
            dataKey="date"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const num = value / 1000
              const symbol = currencySymbols[currency]
              return num >= 1 ? `${symbol}${num.toFixed(0)}k` : `${symbol}${value}`
            }}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RoomPerformanceChart({ metrics }: ChartProps) {
  const { currency, t } = useLanguage()
  if (!metrics.category_breakdown || metrics.category_breakdown.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        {t.pages.analytics.noRoomPerformance}
      </div>
    )
  }

  const data = metrics.category_breakdown.map((cat: any) => ({
    name: cat.category_name || cat.name || "",
    revenue: cat.revenue,
    bookings: cat.bookings,
    occupancy: cat.occupancy_rate || 0,
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
          <XAxis
            dataKey="name"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            label={{
              value: t.analytics.trends.chartLabels.room,
              position: "insideBottom",
              offset: -5,
              className: "text-xs text-neutral-600 dark:text-neutral-400",
            }}
          />
          <YAxis
            yAxisId="left"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const num = value / 1000
              const symbol = currencySymbols[currency]
              return num >= 1 ? `${symbol}${num.toFixed(0)}k` : `${symbol}${value}`
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            fill={COLORS.primary}
            name={t.analytics.trends.chartLabels.revenue}
          />
          <Bar
            yAxisId="right"
            dataKey="occupancy"
            fill={COLORS.secondary}
            name={t.analytics.trends.chartLabels.occupancyPercent}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PaymentDistributionChart({ metrics }: ChartProps) {
  const { currency, t } = useLanguage()
  // currency is used in PaymentDistributionTooltip wrapper
  if (!metrics.payment_distribution) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No payment distribution data available
      </div>
    )
  }

  const paymentDist = metrics.payment_distribution as any
  const data = [
    {
      name: t.paymentMethods.cash,
      value: paymentDist.cash_percentage || 0,
      amount: paymentDist.cash_amount || 0,
    },
    {
      name: t.paymentMethods.bankTransfer,
      value: paymentDist.transfer_percentage || 0,
      amount: paymentDist.transfer_amount || 0,
    },
    {
      name: t.paymentMethods.terminal,
      value: paymentDist.terminal_percentage || 0,
      amount: paymentDist.terminal_amount || 0,
    },
  ].filter((item) => item.value > 0)

  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-sm font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<PaymentDistributionTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CustomerDemographicsChart({ metrics }: ChartProps) {
  if (!metrics.customer_metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No customer data available
      </div>
    )
  }

  // Customer type data for pie chart
  const customerTypeData = [
    { name: "New", value: metrics.customer_metrics.new_customers },
    { name: "Returning", value: metrics.customer_metrics.returning_customers },
  ]

  // Age distribution data for bar chart
  const ageData = metrics.customer_metrics.age_distribution
    ? Object.entries(metrics.customer_metrics.age_distribution).map(
        ([group, count]) => ({
          age: group,
          count,
        }),
      )
    : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Customer Type Pie Chart */}
      <div>
        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
          Customer Type Distribution
        </h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={customerTypeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }: any) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                <Cell fill={COLORS.primary} />
                <Cell fill={COLORS.secondary} />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Age Distribution Bar Chart */}
      {ageData.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
            Age Distribution
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ageData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-neutral-200 dark:stroke-neutral-700"
                />
                <XAxis
                  dataKey="age"
                  className="text-xs text-neutral-600 dark:text-neutral-400"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  className="text-xs text-neutral-600 dark:text-neutral-400"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.accent} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// Seasonal trends chart for multi-year analysis
export function SeasonalTrendsChart({ data }: { data: any }) {
  const { currency, t } = useLanguage()
  if (!data || !data.monthly_data || data.monthly_data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        {t.pages.analytics.noSeasonalTrends}
      </div>
    )
  }

  // Transform data for chart
  const chartData = data.monthly_data.map((point: any) => ({
    month: point.month,
    revenue: point.revenue,
    bookings: point.bookings,
    occupancy: point.occupancy_rate,
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
          <XAxis
            dataKey="month"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const num = value / 1000
              const symbol = currencySymbols[currency]
              return num >= 1 ? `${symbol}${num.toFixed(0)}k` : `${symbol}${value}`
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            stroke={COLORS.primary}
            strokeWidth={2}
            name={t.analytics.trends.chartLabels.revenue}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="occupancy"
            stroke={COLORS.secondary}
            strokeWidth={2}
            name={t.analytics.trends.chartLabels.occupancyPercent}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="bookings"
            stroke={COLORS.accent}
            strokeWidth={2}
            name={t.analytics.trends.chartLabels.bookings}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// District Revenue Chart
export function DistrictRevenueChart({ data }: { data: any }) {
  const { currency } = useLanguage()
  if (!data?.districts || data.districts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No district revenue data available
      </div>
    )
  }

  const chartData = data.districts.map((district: any) => ({
    name: district.district.replace(/_/g, " "),
    revenue: district.revenue,
    bookings: district.bookings,
    percentage: district.percentage,
  }))

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const num = value / 1000
              const symbol = currencySymbols[currency]
              return num >= 1 ? `${symbol}${num.toFixed(0)}k` : `${symbol}${value}`
            }}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend />
          <Bar dataKey="revenue" fill={COLORS.primary} name="Revenue" />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Table */}
      <div className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max rounded-lg border-spacing-0 border-separate border border-neutral-200 dark:border-neutral-600">
            <thead>
              <tr className="bg-neutral-50 dark:bg-dark-2">
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  District
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  %
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Bookings
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Avg Booking
                </th>
              </tr>
            </thead>
            <tbody>
              {data.districts.map((district: any, index: number) => (
                <tr
                  key={district.district}
                  className={
                    index % 2 === 0
                      ? "bg-white dark:bg-transparent"
                      : "bg-neutral-50 dark:bg-dark-2"
                  }
                >
                  <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                    {district.district.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-700 dark:text-neutral-300">
                    {formatCurrency(district.revenue, currency as any)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-700 dark:text-neutral-300">
                    {district.percentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-700 dark:text-neutral-300">
                    {district.bookings}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-neutral-700 dark:text-neutral-300">
                    {formatCurrency(district.average_booking_value, currency as any)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Mini chart for metrics cards
export function SparklineChart({
  data,
  color = COLORS.primary,
}: { data: number[]; color?: string }) {
  const chartData = data.map((value, index) => ({
    index,
    value,
  }))

  return (
    <ResponsiveContainer width="100%" height={50}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
      >
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
