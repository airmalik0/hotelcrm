"""
Chart generation service for analytics visualizations.
Generates matplotlib charts for PDF reports and Excel exports.
"""
import io
from datetime import datetime
from typing import Any

import matplotlib
import matplotlib.pyplot as plt
import seaborn as sns

from app.localization import get_report_text

# Use non-interactive backend for server environment
matplotlib.use('Agg')

# Set style for professional charts
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")


class ChartService:
    """Service for generating analytics charts using matplotlib."""

    def __init__(self):
        """Initialize chart service with styling."""
        # Set default figure size and DPI for high quality
        self.fig_size = (10, 6)
        self.dpi = 300

        # Color palette for consistency
        self.colors = {
            'primary': '#3B82F6',  # Blue
            'success': '#10B981',  # Green
            'warning': '#F59E0B',  # Amber
            'danger': '#EF4444',   # Red
            'purple': '#8B5CF6',   # Purple
            'teal': '#14B8A6',     # Teal
            'gray': '#6B7280',     # Gray
        }

    def _create_figure(self, figsize: tuple[float, float] | None = None) -> tuple[plt.Figure, plt.Axes]:
        """Create a new figure with consistent styling."""
        figsize = figsize or self.fig_size
        fig, ax = plt.subplots(figsize=figsize, dpi=self.dpi)
        fig.patch.set_facecolor('white')
        return fig, ax

    def _save_chart_to_buffer(self, fig: plt.Figure) -> io.BytesIO:
        """Save chart to BytesIO buffer."""
        buffer = io.BytesIO()
        fig.savefig(buffer, format='png', dpi=self.dpi, bbox_inches='tight',
                   facecolor='white', edgecolor='none')
        buffer.seek(0)
        plt.close(fig)  # Free memory
        return buffer

    def generate_revenue_trend_chart(self, revenue_trend: list[dict[str, Any]], language: str = "en") -> io.BytesIO:
        """Generate revenue trend line chart."""
        if not revenue_trend:
            return self._generate_empty_chart(get_report_text('no_revenue_data_available', language), language)

        fig, ax = self._create_figure((12, 6))

        # Extract data
        dates = [point['date'] for point in revenue_trend]
        values = [point['value'] for point in revenue_trend]

        # Convert dates to datetime objects for better formatting
        date_objects: list[datetime] = []
        for date in dates:
            try:
                # Full ISO with optional Z
                date_objects.append(datetime.fromisoformat(date.replace('Z', '+00:00')))
                continue
            except Exception:
                pass
            try:
                # YYYY-MM (month)
                date_objects.append(datetime.strptime(date, "%Y-%m"))
                continue
            except Exception:
                pass
            try:
                # YYYY-Wxx (week number) → take Monday of that ISO week
                if 'W' in date:
                    year_str, week_str = date.split('-W')
                    year = int(year_str)
                    week = int(week_str)
                    # ISO weeks: Monday is 1
                    date_objects.append(datetime.fromisocalendar(year, week, 1))
                    continue
            except Exception:
                pass
            # Fallback: use first day of current month/year if parse fails
            try:
                date_objects.append(datetime.strptime(date, "%Y-%m-%d"))
            except Exception:
                # As a last resort, use epoch
                date_objects.append(datetime(1970, 1, 1))

        # Create line chart
        ax.plot(date_objects, values, marker='o', linewidth=2.5, markersize=6,
                color=self.colors['primary'], markerfacecolor=self.colors['primary'])

        # Formatting
        ax.set_title(get_report_text('revenue_trend_over_time', language), fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel(get_report_text('date', language), fontsize=12)
        ax.set_ylabel(get_report_text('revenue', language) + ' ($)', fontsize=12)

        # Format y-axis as currency
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

        # Rotate x-axis labels for better readability
        plt.xticks(rotation=45)

        # Add grid
        ax.grid(True, alpha=0.3)

        # Add subtle background
        ax.set_facecolor('#f8f9fa')

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)

    def generate_payment_distribution_chart(self, payment_data: dict[str, Any], language: str = "en") -> io.BytesIO:
        """Generate payment method distribution pie chart."""
        # Extract payment percentages
        methods = []
        percentages = []

        if payment_data.get('cash_percentage', 0) > 0:
            methods.append('Cash')
            percentages.append(payment_data['cash_percentage'])

        if payment_data.get('transfer_percentage', 0) > 0:
            methods.append('Bank Transfer')
            percentages.append(payment_data['transfer_percentage'])

        if payment_data.get('terminal_percentage', 0) > 0:
            methods.append('Terminal/Card')
            percentages.append(payment_data['terminal_percentage'])

        if not methods:
            return self._generate_empty_chart(get_report_text('no_payment_data_available', language), language)

        fig, ax = self._create_figure((8, 8))

        # Color mapping
        colors = [self.colors['success'], self.colors['primary'], self.colors['warning']][:len(methods)]

        # Create pie chart
        wedges, texts, autotexts = ax.pie(percentages, labels=methods, autopct='%1.1f%%',
                                         colors=colors, startangle=90,
                                         textprops={'fontsize': 11})

        # Enhance text styling
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')

        ax.set_title(get_report_text('payment_methods_distribution', language), fontsize=16, fontweight='bold', pad=20)

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)

    def generate_hourly_distribution_chart(self, hourly_data: list[dict[str, Any]], metric: str = "check_ins", language: str = "en") -> io.BytesIO:
        """Generate hourly distribution bar chart."""
        if not hourly_data:
            metric_key = 'no_check_ins_data_available' if metric == 'check_ins' else 'no_check_outs_data_available'
            return self._generate_empty_chart(get_report_text(metric_key, language), language)

        fig, ax = self._create_figure((14, 6))

        # Extract data
        hours = [item['hour'] for item in hourly_data]
        counts = [item['count'] for item in hourly_data]

        # Create bar chart
        bars = ax.bar(hours, counts, color=self.colors['teal'], alpha=0.8, edgecolor='white', linewidth=0.5)

        # Highlight peak hours
        max_count = max(counts) if counts else 0
        for i, bar in enumerate(bars):
            if counts[i] >= max_count * 0.8:  # Top 20% are peak hours
                bar.set_color(self.colors['danger'])

        # Formatting
        metric_title = get_report_text(metric, language) if metric in ['check_ins', 'check_outs'] else metric.replace('_', ' ').title()
        ax.set_title(f'{get_report_text("hourly_check_ins_distribution", language) if metric == "check_ins" else get_report_text("hourly_check_outs_distribution", language)}', fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel(get_report_text('hour_of_day', language), fontsize=12)
        ax.set_ylabel(f'{get_report_text("number_of_events", language)}', fontsize=12)

        # Set x-axis ticks for all 24 hours
        ax.set_xticks(range(0, 24, 2))
        ax.set_xticklabels([f'{h:02d}:00' for h in range(0, 24, 2)])

        # Add grid
        ax.grid(True, alpha=0.3, axis='y')

        # Add value labels on bars for non-zero values
        for hour, count in zip(hours, counts, strict=False):
            if count > 0:
                ax.text(hour, count + max_count * 0.01, str(count),
                       ha='center', va='bottom', fontsize=9)

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)

    def generate_room_performance_chart(self, room_data: list[dict[str, Any]], language: str = "en") -> io.BytesIO:
        """Generate room category performance chart."""
        if not room_data:
            return self._generate_empty_chart(get_report_text('no_room_performance_data_available', language), language)

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

        # Extract data
        room_types = [
            (room.get('category_name') or room.get('category_id') or 'Uncategorized')
            for room in room_data
        ]
        revenues = [room['revenue'] for room in room_data]
        occupancy_rates = [room['occupancy_rate'] for room in room_data]

        # Revenue bar chart
        bars1 = ax1.bar(room_types, revenues, color=self.colors['primary'], alpha=0.8)
        ax1.set_title('Revenue by Category', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Revenue ($)')
        ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

        # Add value labels on bars
        for bar, revenue in zip(bars1, revenues, strict=False):
            ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(revenues) * 0.01,
                    f'${revenue:,.0f}', ha='center', va='bottom', fontsize=10)

        # Occupancy rate bar chart
        bars2 = ax2.bar(room_types, occupancy_rates, color=self.colors['success'], alpha=0.8)
        ax2.set_title('Occupancy Rate by Category', fontsize=14, fontweight='bold')
        ax2.set_ylabel('Occupancy Rate (%)')
        ax2.set_ylim(0, 100)

        # Add value labels on bars
        for bar, rate in zip(bars2, occupancy_rates, strict=False):
            ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2,
                    f'{rate}%', ha='center', va='bottom', fontsize=10)

        # Add grids
        ax1.grid(True, alpha=0.3, axis='y')
        ax2.grid(True, alpha=0.3, axis='y')

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)

    def generate_customer_demographics_chart(self, age_distribution: dict[str, int], district_distribution: dict[str, int], language: str = "en") -> io.BytesIO:
        """Generate customer demographics charts."""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

        # Age distribution
        if age_distribution and any(count > 0 for count in age_distribution.values()):
            age_groups = list(age_distribution.keys())
            age_counts = list(age_distribution.values())

            # Filter out zero counts
            filtered_age = [(group, count) for group, count in zip(age_groups, age_counts, strict=False) if count > 0]
            if filtered_age:
                age_groups, age_counts = zip(*filtered_age, strict=False)

            if age_groups:
                colors1 = sns.color_palette("viridis", len(age_groups))
                ax1.pie(age_counts, labels=age_groups, autopct='%1.1f%%', colors=colors1, startangle=90)
                ax1.set_title(get_report_text('customer_age_distribution_chart', language), fontsize=14, fontweight='bold')
        else:
            ax1.text(0.5, 0.5, get_report_text('no_age_data_available', language), ha='center', va='center', transform=ax1.transAxes)
            ax1.set_title(get_report_text('customer_age_distribution_chart', language), fontsize=14, fontweight='bold')

        # District distribution (top 8)
        if district_distribution and any(count > 0 for count in district_distribution.values()):
            # Sort by count and take top 8
            sorted_districts = sorted(district_distribution.items(), key=lambda x: x[1], reverse=True)[:8]
            districts, counts = zip(*sorted_districts, strict=False) if sorted_districts else ([], [])

            if districts:
                colors2 = sns.color_palette("Set3", len(districts))
                bars = ax2.barh(districts, counts, color=colors2)
                ax2.set_title(get_report_text('top_districts_by_customers', language), fontsize=14, fontweight='bold')
                ax2.set_xlabel(get_report_text('number_of_customers', language))

                # Add value labels
                for bar, count in zip(bars, counts, strict=False):
                    ax2.text(bar.get_width() + max(counts) * 0.01, bar.get_y() + bar.get_height()/2,
                            str(count), ha='left', va='center', fontsize=10)
        else:
            ax2.text(0.5, 0.5, get_report_text('no_district_data_available', language), ha='center', va='center', transform=ax2.transAxes)
            ax2.set_title(get_report_text('top_districts_by_customers', language), fontsize=14, fontweight='bold')

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)

    def generate_seasonal_trends_chart(self, monthly_trends: list[dict[str, Any]], language: str = "en") -> io.BytesIO:
        """Generate seasonal trends chart."""
        if not monthly_trends:
            return self._generate_empty_chart(get_report_text('no_seasonal_data_available', language), language)

        fig, ax = self._create_figure((14, 8))

        # Extract data
        months = [trend['month_name'] for trend in monthly_trends]
        revenues = [trend['revenue'] for trend in monthly_trends]
        bookings = [trend['bookings'] for trend in monthly_trends]

        # Create dual-axis chart
        ax2 = ax.twinx()

        # Revenue line
        ax.plot(months, revenues, marker='o', linewidth=3, markersize=8,
               color=self.colors['primary'], label='Revenue')

        # Bookings line
        ax2.plot(months, bookings, marker='s', linewidth=3, markersize=8,
                color=self.colors['success'], label='Bookings')

        # Formatting
        ax.set_title(get_report_text('seasonal_revenue_and_booking_trends', language), fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel(get_report_text('month', language), fontsize=12)
        ax.set_ylabel(get_report_text('revenue', language) + ' ($)', fontsize=12, color=self.colors['primary'])
        ax2.set_ylabel(get_report_text('number_of_events', language), fontsize=12, color=self.colors['success'])

        # Format axes
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))
        ax.tick_params(axis='y', labelcolor=self.colors['primary'])
        ax2.tick_params(axis='y', labelcolor=self.colors['success'])

        # Rotate x-axis labels
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')

        # Add grids
        ax.grid(True, alpha=0.3)

        # Combine legends
        lines1, labels1 = ax.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax.legend(lines1 + lines2, labels1 + labels2, loc='upper left')

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)

    def generate_customer_segments_chart(self, segments_data: dict[str, Any], language: str = "en") -> io.BytesIO:
        """Generate customer segmentation pie chart."""
        segments = segments_data.get('segments', {})

        if not segments:
            return self._generate_empty_chart(get_report_text('no_customer_segmentation_data_available', language), language)

        fig, ax = self._create_figure((10, 8))

        # Extract data (only non-zero segments)
        segment_names = []
        segment_counts = []

        segment_labels = {
            'vip': 'VIP Customers',
            'loyal': 'Loyal Customers',
            'regular': 'Regular Customers',
            'new': 'New Customers',
            'at_risk': 'At Risk Customers'
        }

        for segment, data in segments.items():
            count = data.get('count', 0)
            if count > 0:
                segment_names.append(segment_labels.get(segment, segment.title()))
                segment_counts.append(count)

        if not segment_names:
            return self._generate_empty_chart(get_report_text('no_customer_segmentation_data_available', language), language)

        # Color mapping for segments
        segment_colors = {
            'VIP Customers': self.colors['warning'],
            'Loyal Customers': self.colors['success'],
            'Regular Customers': self.colors['primary'],
            'New Customers': self.colors['purple'],
            'At Risk Customers': self.colors['danger']
        }

        colors = [segment_colors.get(name, self.colors['gray']) for name in segment_names]

        # Create pie chart
        wedges, texts, autotexts = ax.pie(segment_counts, labels=segment_names, autopct='%1.1f%%',
                                         colors=colors, startangle=90, textprops={'fontsize': 11})

        # Enhance text styling
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')

        ax.set_title(get_report_text('customer_segmentation', language), fontsize=16, fontweight='bold', pad=20)

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)

    def generate_ltv_distribution_chart(self, ltv_by_tenure: list[dict[str, Any]], language: str = "en") -> io.BytesIO:
        """Generate customer LTV by tenure chart."""
        if not ltv_by_tenure:
            return self._generate_empty_chart(get_report_text('no_ltv_data_available', language), language)

        fig, ax = self._create_figure((10, 6))

        # Extract data
        tenures = [item['tenure'].replace('_', ' ').title() for item in ltv_by_tenure]
        avg_ltvs = [item['average_ltv'] for item in ltv_by_tenure]
        customer_counts = [item['customer_count'] for item in ltv_by_tenure]

        # Create bar chart with customer count as width indicator
        bars = ax.bar(tenures, avg_ltvs, color=self.colors['purple'], alpha=0.8)

        # Adjust bar width based on customer count (normalize)
        max_count = max(customer_counts) if customer_counts else 1
        for bar, count in zip(bars, customer_counts, strict=False):
            width_factor = 0.3 + 0.7 * (count / max_count)  # 0.3 to 1.0 range
            current_width = bar.get_width()
            bar.set_width(current_width * width_factor)

        # Formatting
        ax.set_title(get_report_text('customer_lifetime_value_by_tenure', language), fontsize=16, fontweight='bold', pad=20)
        ax.set_xlabel(get_report_text('customer_tenure', language), fontsize=12)
        ax.set_ylabel(get_report_text('average_ltv', language), fontsize=12)

        # Format y-axis as currency
        ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))

        # Add value labels on bars
        for bar, ltv, count in zip(bars, avg_ltvs, customer_counts, strict=False):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(avg_ltvs) * 0.01,
                   f'${ltv:,.0f}\n({count} customers)', ha='center', va='bottom', fontsize=10)

        # Add grid
        ax.grid(True, alpha=0.3, axis='y')

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)

    def _generate_empty_chart(self, message: str, language: str = "en") -> io.BytesIO:
        """Generate an empty chart with a message."""
        fig, ax = self._create_figure((8, 6))

        ax.text(0.5, 0.5, message, ha='center', va='center',
               transform=ax.transAxes, fontsize=14, color=self.colors['gray'])
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')

        plt.tight_layout()
        return self._save_chart_to_buffer(fig)
