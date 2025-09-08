import io
from typing import Any

import matplotlib
import matplotlib.pyplot as plt
import seaborn as sns

# Use non-interactive backend
matplotlib.use('Agg')

# Set style
sns.set_theme(style="whitegrid")


class ChartService:
    def __init__(self) -> None:
        self.figure_size = (10, 6)
        self.dpi = 100
        self.colors = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

    async def create_occupancy_chart(
        self, data: list[dict[str, Any]], chart_type: str = "line"
    ) -> bytes:
        """Create occupancy rate chart."""
        if not data:
            return self._create_empty_chart("No data available")

        # Extract data
        periods = [d["period_label"] for d in data]
        occupancy_rates = [d["occupancy_rate"] for d in data]

        # Create figure
        fig, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)

        if chart_type == "bar":
            ax.bar(periods, occupancy_rates, color=self.colors[0])
        else:
            ax.plot(periods, occupancy_rates, marker="o", color=self.colors[0], linewidth=2)
            ax.fill_between(range(len(periods)), occupancy_rates, alpha=0.3, color=self.colors[0])

        ax.set_xlabel("Period", fontsize=12)
        ax.set_ylabel("Occupancy Rate (%)", fontsize=12)
        ax.set_title("Room Occupancy Rate Over Time", fontsize=14, fontweight="bold")

        # Rotate x-axis labels if many periods
        if len(periods) > 10:
            plt.xticks(rotation=45, ha="right")

        # Add grid
        ax.grid(True, alpha=0.3)

        # Add horizontal line at 50% and 80%
        ax.axhline(y=50, color="gray", linestyle="--", alpha=0.5, label="50% threshold")
        ax.axhline(y=80, color="green", linestyle="--", alpha=0.5, label="80% target")
        ax.legend()

        plt.tight_layout()

        # Save to bytes
        buffer = io.BytesIO()
        plt.savefig(buffer, format="png")
        plt.close()
        buffer.seek(0)
        return buffer.read()

    async def create_revenue_chart(
        self, data: list[dict[str, Any]], chart_type: str = "bar"
    ) -> bytes:
        """Create revenue chart."""
        if not data:
            return self._create_empty_chart("No data available")

        # Extract data
        periods = [d["period_label"] for d in data]
        revenues = [d["total_revenue"] for d in data]

        # Create figure
        fig, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)

        if chart_type == "line":
            ax.plot(periods, revenues, marker="o", color=self.colors[1], linewidth=2)
            ax.fill_between(range(len(periods)), revenues, alpha=0.3, color=self.colors[1])
        else:
            bars = ax.bar(periods, revenues, color=self.colors[1])
            # Add value labels on bars
            for bar in bars:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'${height:,.0f}',
                       ha='center', va='bottom', fontsize=9)

        ax.set_xlabel("Period", fontsize=12)
        ax.set_ylabel("Revenue ($)", fontsize=12)
        ax.set_title("Revenue Analysis", fontsize=14, fontweight="bold")

        # Format y-axis as currency
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

        # Rotate x-axis labels if many periods
        if len(periods) > 10:
            plt.xticks(rotation=45, ha="right")

        # Add grid
        ax.grid(True, alpha=0.3)

        plt.tight_layout()

        # Save to bytes
        buffer = io.BytesIO()
        plt.savefig(buffer, format="png")
        plt.close()
        buffer.seek(0)
        return buffer.read()

    async def create_payment_methods_pie_chart(
        self, data: list[dict[str, Any]]
    ) -> bytes:
        """Create pie chart for payment methods distribution."""
        if not data:
            return self._create_empty_chart("No data available")

        # Aggregate totals across all periods
        total_cash = sum(d["cash"]["count"] for d in data)
        total_terminal = sum(d["terminal"]["count"] for d in data)
        total_transfer = sum(d["transfer"]["count"] for d in data)

        labels = ["Cash", "Terminal", "Transfer"]
        sizes = [total_cash, total_terminal, total_transfer]
        colors = self.colors[:3]

        # Create figure
        fig, ax = plt.subplots(figsize=(8, 8), dpi=self.dpi)

        wedges, texts, autotexts = ax.pie(
            sizes,
            labels=labels,
            colors=colors,
            autopct='%1.1f%%',
            startangle=90,
            textprops={'fontsize': 12}
        )

        # Make percentage text bold
        for autotext in autotexts:
            autotext.set_fontweight('bold')
            autotext.set_color('white')

        ax.set_title("Payment Methods Distribution", fontsize=14, fontweight="bold")

        plt.tight_layout()

        # Save to bytes
        buffer = io.BytesIO()
        plt.savefig(buffer, format="png")
        plt.close()
        buffer.seek(0)
        return buffer.read()

    async def create_customer_distribution_chart(
        self, data: list[dict[str, Any]], top_n: int = 10
    ) -> bytes:
        """Create horizontal bar chart for top districts by revenue."""
        if not data:
            return self._create_empty_chart("No data available")

        # Sort and take top N
        sorted_data = sorted(data, key=lambda x: x["total_revenue"], reverse=True)[:top_n]

        districts = [d["district"] for d in sorted_data]
        revenues = [d["total_revenue"] for d in sorted_data]

        # Create figure
        fig, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)

        # Create horizontal bar chart
        bars = ax.barh(districts, revenues, color=self.colors[3])

        # Add value labels
        for bar in bars:
            width = bar.get_width()
            ax.text(width, bar.get_y() + bar.get_height()/2.,
                   f'${width:,.0f}',
                   ha='left', va='center', fontsize=9)

        ax.set_xlabel("Total Revenue ($)", fontsize=12)
        ax.set_ylabel("District", fontsize=12)
        ax.set_title(f"Top {top_n} Districts by Revenue", fontsize=14, fontweight="bold")

        # Format x-axis as currency
        ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

        # Add grid
        ax.grid(True, alpha=0.3, axis='x')

        plt.tight_layout()

        # Save to bytes
        buffer = io.BytesIO()
        plt.savefig(buffer, format="png")
        plt.close()
        buffer.seek(0)
        return buffer.read()

    async def create_weekly_pattern_heatmap(
        self, data: list[dict[str, Any]]
    ) -> bytes:
        """Create heatmap for weekly booking patterns."""
        if not data:
            return self._create_empty_chart("No data available")

        # Create matrix for heatmap (7 days)
        days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        booking_counts = []

        for day_data in data:
            booking_counts.append(day_data["booking_count"])

        # Reshape for heatmap (1 row, 7 columns)
        heatmap_data = [booking_counts]

        # Create figure
        fig, ax = plt.subplots(figsize=(12, 3), dpi=self.dpi)

        # Create heatmap
        sns.heatmap(
            heatmap_data,
            annot=True,
            fmt="d",
            cmap="YlOrRd",
            xticklabels=days,
            yticklabels=["Bookings"],
            cbar_kws={'label': 'Number of Bookings'},
            ax=ax
        )

        ax.set_title("Weekly Booking Pattern", fontsize=14, fontweight="bold")

        plt.tight_layout()

        # Save to bytes
        buffer = io.BytesIO()
        plt.savefig(buffer, format="png")
        plt.close()
        buffer.seek(0)
        return buffer.read()

    async def create_seasonal_trend_chart(
        self, data: list[dict[str, Any]]
    ) -> bytes:
        """Create multi-line chart for seasonal trends."""
        if not data:
            return self._create_empty_chart("No data available")

        # Extract data
        periods = [d["month_label"] for d in data]
        bookings = [d["booking_count"] for d in data]
        revenues = [d["revenue"] for d in data]

        # Create figure with two y-axes
        fig, ax1 = plt.subplots(figsize=self.figure_size, dpi=self.dpi)

        # Plot bookings on primary y-axis
        color = self.colors[0]
        ax1.set_xlabel("Month", fontsize=12)
        ax1.set_ylabel("Number of Bookings", color=color, fontsize=12)
        line1 = ax1.plot(periods, bookings, marker="o", color=color, linewidth=2, label="Bookings")
        ax1.tick_params(axis='y', labelcolor=color)
        ax1.grid(True, alpha=0.3)

        # Create secondary y-axis for revenue
        ax2 = ax1.twinx()
        color = self.colors[1]
        ax2.set_ylabel("Revenue ($)", color=color, fontsize=12)
        line2 = ax2.plot(periods, revenues, marker="s", color=color, linewidth=2, label="Revenue")
        ax2.tick_params(axis='y', labelcolor=color)

        # Format y-axis as currency
        ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

        # Rotate x-axis labels
        plt.xticks(rotation=45, ha="right")

        # Add legend
        lines = line1 + line2
        labels = [line.get_label() for line in lines]
        ax1.legend(lines, labels, loc="upper left")

        ax1.set_title("Seasonal Trend Analysis", fontsize=14, fontweight="bold")

        plt.tight_layout()

        # Save to bytes
        buffer = io.BytesIO()
        plt.savefig(buffer, format="png")
        plt.close()
        buffer.seek(0)
        return buffer.read()

    def _create_empty_chart(self, message: str) -> bytes:
        """Create empty chart with message."""
        fig, ax = plt.subplots(figsize=self.figure_size, dpi=self.dpi)
        ax.text(0.5, 0.5, message, ha="center", va="center", fontsize=16, color="gray")
        ax.set_xticks([])
        ax.set_yticks([])
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_visible(False)
        ax.spines['left'].set_visible(False)

        buffer = io.BytesIO()
        plt.savefig(buffer, format="png")
        plt.close()
        buffer.seek(0)
        return buffer.read()
