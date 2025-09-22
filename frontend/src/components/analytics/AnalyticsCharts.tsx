import type { DashboardMetrics } from "@/client/types.gen"
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

interface ChartProps {
  metrics: DashboardMetrics
}

// Custom tooltip for currency formatting
const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-white dark:bg-dark-2 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-600">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm mt-1" style={{ color: entry.color }}>
          {entry.name}: ${entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// Custom tooltip for percentage
const PercentageTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-white dark:bg-dark-2 p-3 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-600">
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {label}
      </p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm mt-1" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

export function RevenueTrendChart({ metrics }: ChartProps) {
  if (!metrics.revenue_trend || metrics.revenue_trend.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No revenue trend data available
      </div>
    )
  }

  const data = metrics.revenue_trend.map((point) => ({
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
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
  if (
    !metrics.room_type_breakdown ||
    metrics.room_type_breakdown.length === 0
  ) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No room performance data available
      </div>
    )
  }

  const data = metrics.room_type_breakdown.map((room) => ({
    name: room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1),
    revenue: room.revenue,
    bookings: room.bookings,
    occupancy: room.occupancy_rate,
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
          />
          <YAxis
            yAxisId="left"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
            name="Revenue"
          />
          <Bar
            yAxisId="right"
            dataKey="occupancy"
            fill={COLORS.secondary}
            name="Occupancy %"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PaymentDistributionChart({ metrics }: ChartProps) {
  if (!metrics.payment_distribution) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No payment distribution data available
      </div>
    )
  }

  const data = [
    {
      name: "Cash",
      value: metrics.payment_distribution.cash_percentage,
      amount: metrics.payment_distribution.cash_amount,
    },
    {
      name: "Bank Transfer",
      value: metrics.payment_distribution.transfer_percentage,
      amount: metrics.payment_distribution.transfer_amount,
    },
    {
      name: "Terminal/Card",
      value: metrics.payment_distribution.terminal_percentage,
      amount: metrics.payment_distribution.terminal_amount,
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
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<PercentageTooltip />} />
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
                label={({ name, percent }) =>
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
  if (!data || !data.monthly_data || data.monthly_data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No seasonal trends data available
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
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
            name="Revenue"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="occupancy"
            stroke={COLORS.secondary}
            strokeWidth={2}
            name="Occupancy %"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="bookings"
            stroke={COLORS.accent}
            strokeWidth={2}
            name="Bookings"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Customer segments chart
export function CustomerSegmentsChart({ data }: { data: any }) {
  if (!data || !data.segments || Object.keys(data.segments).length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No customer segments data available
      </div>
    )
  }

  // Transform segments data for pie chart
  const segmentData = Object.entries(data.segments).map(
    ([segment, info]: [string, any]) => ({
      name: segment.charAt(0).toUpperCase() + segment.slice(1),
      value: info.count,
      revenue: info.total_revenue,
      percentage: info.percentage,
    }),
  )

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segmentData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percentage }) =>
              `${name} ${percentage?.toFixed(1)}%`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {segmentData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, props) => [
              `${value} customers`,
              props.payload.name,
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Customer LTV distribution chart
export function CustomerLtvChart({ data }: { data: any }) {
  if (!data || !data.ltv_distribution || data.ltv_distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No LTV distribution data available
      </div>
    )
  }

  // Transform LTV data for bar chart
  const chartData = data.ltv_distribution.map((bucket: any) => ({
    range: bucket.range,
    count: bucket.customer_count,
    totalValue: bucket.total_ltv,
    averageValue: bucket.average_ltv,
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
          <XAxis
            dataKey="range"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value, name) => [
              name === "count"
                ? `${value} customers`
                : `$${value?.toLocaleString()}`,
              name === "count"
                ? "Customer Count"
                : name === "totalValue"
                  ? "Total LTV"
                  : "Average LTV",
            ]}
          />
          <Legend />
          <Bar dataKey="count" fill={COLORS.primary} name="Customer Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// LTV trend over time chart
export function LtvTrendChart({ data }: { data: any }) {
  if (!data || !data.ltv_trend || data.ltv_trend.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No LTV trend data available
      </div>
    )
  }

  const chartData = data.ltv_trend.map((point: any) => ({
    period: point.period,
    avgLtv: point.average_ltv,
    customerCount: point.customer_count,
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
            dataKey="period"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="avgLtv"
            stroke={COLORS.primary}
            strokeWidth={2}
            name="Average LTV"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="customerCount"
            stroke={COLORS.secondary}
            strokeWidth={2}
            name="Customer Count"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Booking frequency patterns chart
export function BookingFrequencyChart({ data }: { data: any }) {
  if (
    !data ||
    !data.frequency_distribution ||
    data.frequency_distribution.length === 0
  ) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No booking frequency data available
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.frequency_distribution}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
          <XAxis
            dataKey="frequency_range"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="customer_count"
            fill={COLORS.primary}
            name="Customer Count"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Room preference patterns chart
export function RoomPreferenceChart({ data }: { data: any }) {
  if (
    !data ||
    !data.room_preferences ||
    Object.keys(data.room_preferences).length === 0
  ) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No room preference data available
      </div>
    )
  }

  const chartData = Object.entries(data.room_preferences).map(
    ([roomType, count]) => ({
      name: roomType.charAt(0).toUpperCase() + roomType.slice(1),
      value: count as number,
    }),
  )

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Booking timing patterns chart
export function BookingTimingChart({ data }: { data: any }) {
  if (!data || !data.booking_timing || data.booking_timing.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No booking timing data available
      </div>
    )
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data.booking_timing}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
          <XAxis
            dataKey="days_in_advance"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="booking_count"
            stroke={COLORS.secondary}
            strokeWidth={2}
            name="Bookings"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Period comparison chart
export function PeriodComparisonChart({ data }: { data: any }) {
  if (!data || (!data.period1_data && !data.period2_data)) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500 dark:text-neutral-400">
        No comparison data available
      </div>
    )
  }

  // Combine data from both periods for comparison
  const chartData = []
  const maxLength = Math.max(
    data.period1_data?.length || 0,
    data.period2_data?.length || 0,
  )

  for (let i = 0; i < maxLength; i++) {
    const item: any = {
      date:
        data.period1_data?.[i]?.date ||
        data.period2_data?.[i]?.date ||
        `Day ${i + 1}`,
    }

    if (data.period1_data?.[i]) {
      item.period1_revenue = data.period1_data[i].revenue
      item.period1_bookings = data.period1_data[i].bookings
    }

    if (data.period2_data?.[i]) {
      item.period2_revenue = data.period2_data[i].revenue
      item.period2_bookings = data.period2_data[i].bookings
    }

    chartData.push(item)
  }

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
            dataKey="date"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs text-neutral-600 dark:text-neutral-400"
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CurrencyTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="period1_revenue"
            stroke={COLORS.primary}
            strokeWidth={2}
            name="Period 1 Revenue"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="period2_revenue"
            stroke={COLORS.secondary}
            strokeWidth={2}
            name="Period 2 Revenue"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="period1_bookings"
            stroke={COLORS.accent}
            strokeWidth={2}
            name="Period 1 Bookings"
            strokeDasharray="5 5"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="period2_bookings"
            stroke={COLORS.purple}
            strokeWidth={2}
            name="Period 2 Bookings"
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
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
