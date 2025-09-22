"""
Chart generation service for analytics reports.
"""
import io

import matplotlib
import matplotlib.pyplot as plt
from matplotlib.figure import Figure

from app.models.analytics import DashboardMetrics

# Use non-interactive backend for server environments
matplotlib.use('Agg')


class ChartGenerator:
    """Service for generating charts from analytics data."""

    def __init__(self) -> None:
        """Initialize chart generator with consistent styling."""
        # Color palette
        self.primary_color = "#3B82F6"  # Blue
        self.secondary_color = "#10B981"  # Green
        self.accent_color = "#F59E0B"  # Amber
        self.colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

        # Set default style
        plt.style.use('seaborn-v0_8-darkgrid')

    def generate_revenue_trend_chart(self, metrics: DashboardMetrics) -> bytes:
        """Generate revenue trend line chart."""
        if not metrics.revenue_trend:
            return self._empty_chart("No revenue trend data available")

        fig, ax = plt.subplots(figsize=(10, 6))

        dates = [point.date for point in metrics.revenue_trend]
        values = [point.value for point in metrics.revenue_trend]

        ax.plot(dates, values, color=self.primary_color, linewidth=2, marker='o', markersize=6)
        ax.fill_between(dates, values, alpha=0.2, color=self.primary_color)

        ax.set_title("Revenue Trend", fontsize=16, fontweight='bold')
        ax.set_xlabel("Date", fontsize=12)
        ax.set_ylabel("Revenue ($)", fontsize=12)
        ax.grid(True, alpha=0.3)

        # Format y-axis as currency
        ax.yaxis.set_major_formatter(matplotlib.ticker.StrMethodFormatter('${x:,.0f}'))

        # Rotate x-axis labels for better readability
        plt.xticks(rotation=45, ha='right')

        plt.tight_layout()

        return self._fig_to_bytes(fig)


    def generate_room_type_performance_chart(self, metrics: DashboardMetrics) -> bytes:
        """Generate room type performance bar chart."""
        if not metrics.room_type_breakdown:
            return self._empty_chart("No room type data available")

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

        room_types = [r.room_type.title() for r in metrics.room_type_breakdown]
        revenues = [r.revenue for r in metrics.room_type_breakdown]
        occupancies = [r.occupancy_rate for r in metrics.room_type_breakdown]

        # Revenue by room type
        bars1 = ax1.bar(room_types, revenues, color=self.colors[:len(room_types)])
        ax1.set_title("Revenue by Room Type", fontsize=14, fontweight='bold')
        ax1.set_xlabel("Room Type", fontsize=12)
        ax1.set_ylabel("Revenue ($)", fontsize=12)
        ax1.yaxis.set_major_formatter(matplotlib.ticker.StrMethodFormatter('${x:,.0f}'))

        # Add value labels on bars
        for bar, value in zip(bars1, revenues, strict=False):
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height,
                    f'${value:,.0f}',
                    ha='center', va='bottom', fontsize=10)

        # Occupancy by room type
        bars2 = ax2.bar(room_types, occupancies, color=self.colors[:len(room_types)])
        ax2.set_title("Occupancy Rate by Room Type", fontsize=14, fontweight='bold')
        ax2.set_xlabel("Room Type", fontsize=12)
        ax2.set_ylabel("Occupancy Rate (%)", fontsize=12)
        ax2.set_ylim(0, 100)

        # Add value labels on bars
        for bar, value in zip(bars2, occupancies, strict=False):
            height = bar.get_height()
            ax2.text(bar.get_x() + bar.get_width()/2., height,
                    f'{value:.1f}%',
                    ha='center', va='bottom', fontsize=10)

        plt.tight_layout()

        return self._fig_to_bytes(fig)

    def generate_payment_distribution_chart(self, metrics: DashboardMetrics) -> bytes:
        """Generate payment method distribution pie chart."""
        if not metrics.payment_distribution:
            return self._empty_chart("No payment distribution data available")

        fig, ax = plt.subplots(figsize=(10, 8))

        labels = []
        sizes = []
        amounts = []

        payment_data = [
            ("Cash", metrics.payment_distribution.cash_percentage,
             metrics.payment_distribution.cash_amount),
            ("Bank Transfer", metrics.payment_distribution.transfer_percentage,
             metrics.payment_distribution.transfer_amount),
            ("Terminal/Card", metrics.payment_distribution.terminal_percentage,
             metrics.payment_distribution.terminal_amount),
        ]

        for label, percentage, amount in payment_data:
            if percentage > 0:
                labels.append(f"{label}\n${amount:,.0f}")
                sizes.append(percentage)
                amounts.append(amount)

        # Create pie chart
        wedges, texts, autotexts = ax.pie(
            sizes,
            labels=labels,
            colors=self.colors[:len(labels)],
            autopct='%1.1f%%',
            startangle=90,
            textprops={'fontsize': 12}
        )

        # Make percentage text bold and white
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_weight('bold')
            autotext.set_fontsize(11)

        ax.set_title("Payment Method Distribution", fontsize=16, fontweight='bold', pad=20)

        # Equal aspect ratio ensures circular pie
        ax.axis('equal')

        plt.tight_layout()

        return self._fig_to_bytes(fig)

    def generate_customer_demographics_chart(self, metrics: DashboardMetrics) -> bytes:
        """Generate customer demographics charts."""
        if not metrics.customer_metrics:
            return self._empty_chart("No customer data available")

        fig = plt.figure(figsize=(14, 10))

        # Customer type distribution (pie chart)
        ax1 = plt.subplot(2, 2, 1)

        customer_types = ["New", "Returning"]
        customer_counts = [
            metrics.customer_metrics.new_customers,
            metrics.customer_metrics.returning_customers
        ]

        if sum(customer_counts) > 0:
            colors_subset = [self.primary_color, self.secondary_color]
            wedges, texts, autotexts = ax1.pie(
                customer_counts,
                labels=customer_types,
                colors=colors_subset,
                autopct='%1.1f%%',
                startangle=90
            )
            for autotext in autotexts:
                autotext.set_color('white')
                autotext.set_weight('bold')

        ax1.set_title("Customer Type Distribution", fontsize=14, fontweight='bold')

        # Age distribution (bar chart)
        ax2 = plt.subplot(2, 2, 2)

        if metrics.customer_metrics.age_distribution:
            age_groups = list(metrics.customer_metrics.age_distribution.keys())
            age_counts = list(metrics.customer_metrics.age_distribution.values())

            bars = ax2.bar(age_groups, age_counts, color=self.accent_color)
            ax2.set_title("Age Distribution", fontsize=14, fontweight='bold')
            ax2.set_xlabel("Age Group", fontsize=11)
            ax2.set_ylabel("Number of Customers", fontsize=11)

            # Add value labels
            for bar, count in zip(bars, age_counts, strict=False):
                height = bar.get_height()
                ax2.text(bar.get_x() + bar.get_width()/2., height,
                        f'{count}',
                        ha='center', va='bottom', fontsize=10)

        # District distribution (horizontal bar chart)
        ax3 = plt.subplot(2, 1, 2)

        if metrics.customer_metrics.district_distribution:
            districts = list(metrics.customer_metrics.district_distribution.keys())[:10]  # Top 10
            district_counts = [metrics.customer_metrics.district_distribution[d] for d in districts]

            bars = ax3.barh(districts, district_counts, color=self.colors[3])
            ax3.set_title("Top Districts by Customer Count", fontsize=14, fontweight='bold')
            ax3.set_xlabel("Number of Customers", fontsize=11)
            ax3.set_ylabel("District", fontsize=11)

            # Add value labels
            for bar, count in zip(bars, district_counts, strict=False):
                width = bar.get_width()
                ax3.text(width, bar.get_y() + bar.get_height()/2.,
                        f'{count}',
                        ha='left', va='center', fontsize=10)

        plt.suptitle("Customer Demographics", fontsize=16, fontweight='bold', y=1.02)
        plt.tight_layout()

        return self._fig_to_bytes(fig)

    def generate_key_metrics_chart(self, metrics: DashboardMetrics) -> bytes:
        """Generate key metrics summary chart."""
        fig, axes = plt.subplots(2, 3, figsize=(15, 8))
        fig.suptitle("Key Performance Metrics", fontsize=18, fontweight='bold', y=1.02)

        # Flatten axes for easier iteration
        axes = axes.flatten()

        # Define metrics to display
        metric_data = [
            ("Total Revenue", f"${metrics.revenue.total_revenue:,.0f}", self.primary_color),
            ("Total Bookings", f"{metrics.revenue.total_bookings}", self.secondary_color),
            ("Avg Daily Rate", f"${metrics.revenue.average_daily_rate:,.0f}", self.accent_color),
            ("Occupancy Rate", f"{metrics.occupancy.occupancy_rate}%", self.colors[3]),
            ("RevPAR", f"${metrics.revenue.revenue_per_available_room:,.0f}", self.colors[4]),
            ("Avg Stay Length", f"{metrics.occupancy.average_length_of_stay:.1f} nights", self.colors[5]),
        ]

        for _idx, (ax, (title, value, color)) in enumerate(zip(axes, metric_data, strict=False)):
            # Remove axis
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.axis('off')

            # Add colored background
            rect = plt.Rectangle((0.05, 0.2), 0.9, 0.6,
                                facecolor=color, alpha=0.1,
                                edgecolor=color, linewidth=2)
            ax.add_patch(rect)

            # Add title
            ax.text(0.5, 0.65, title, ha='center', va='center',
                   fontsize=12, fontweight='bold', color='#374151')

            # Add value
            ax.text(0.5, 0.35, value, ha='center', va='center',
                   fontsize=16, fontweight='bold', color=color)

        plt.tight_layout()

        return self._fig_to_bytes(fig)

    def _empty_chart(self, message: str) -> bytes:
        """Generate empty chart with message."""
        fig, ax = plt.subplots(figsize=(10, 6))
        ax.text(0.5, 0.5, message, ha='center', va='center',
               fontsize=14, color='gray')
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')

        return self._fig_to_bytes(fig)

    def _fig_to_bytes(self, fig: Figure) -> bytes:
        """Convert matplotlib figure to bytes."""
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        plt.close(fig)  # Important: close figure to free memory

        return buf.read()

    def generate_all_charts(self, metrics: DashboardMetrics) -> dict[str, bytes]:
        """Generate all charts for a dashboard report."""
        charts = {}

        # Generate each chart
        charts['key_metrics'] = self.generate_key_metrics_chart(metrics)
        charts['revenue_trend'] = self.generate_revenue_trend_chart(metrics)
        charts['room_performance'] = self.generate_room_type_performance_chart(metrics)
        charts['payment_distribution'] = self.generate_payment_distribution_chart(metrics)
        charts['customer_demographics'] = self.generate_customer_demographics_chart(metrics)

        return charts