"""
PDF report generation service for analytics.
"""
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlmodel import Session

from app.models.analytics import AnalyticsFilter, DashboardMetrics
from app.services.analytics import AnalyticsService
from app.services.chart_service import ChartService


class PDFReportService:
    """Service for generating PDF reports from analytics data."""

    def __init__(self) -> None:
        """Initialize PDF report service."""
        self._register_unicode_fonts()
        self.styles = getSampleStyleSheet()
        self.chart_service = ChartService()
        self._setup_custom_styles()

    def _register_unicode_fonts(self) -> None:
        """Register Unicode-compatible fonts (DejaVu) for international character support."""
        try:
            # Register DejaVu Sans (supports Cyrillic, Arabic, and other Unicode)
            pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
            pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
        except Exception:
            # Fallback to Helvetica if DejaVu is not available
            pass

    def _setup_custom_styles(self) -> None:
        """Setup custom styles for the report."""
        # Determine which font to use
        font_name = "DejaVuSans" if "DejaVuSans" in pdfmetrics.getRegisteredFontNames() else "Helvetica"
        font_name_bold = "DejaVuSans-Bold" if "DejaVuSans-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"

        # Title style
        self.styles.add(
            ParagraphStyle(
                name="CustomTitle",
                parent=self.styles["Heading1"],
                fontName=font_name_bold,
                fontSize=24,
                textColor=colors.HexColor("#1f2937"),
                spaceAfter=30,
                alignment=1,  # Center alignment
            )
        )

        # Section header style
        self.styles.add(
            ParagraphStyle(
                name="SectionHeader",
                parent=self.styles["Heading2"],
                fontName=font_name_bold,
                fontSize=16,
                textColor=colors.HexColor("#374151"),
                spaceBefore=20,
                spaceAfter=12,
            )
        )

        # Metric value style
        self.styles.add(
            ParagraphStyle(
                name="MetricValue",
                parent=self.styles["Normal"],
                fontName=font_name,
                fontSize=14,
                textColor=colors.HexColor("#059669"),
                alignment=2,  # Right alignment
            )
        )

        # Store font names for table usage
        self.font_name = font_name
        self.font_name_bold = font_name_bold

        # Update Normal style to use Unicode font
        self.styles["Normal"].fontName = font_name
        self.styles["Heading1"].fontName = font_name_bold
        self.styles["Heading2"].fontName = font_name_bold

    def generate_dashboard_report(
        self,
        metrics: DashboardMetrics,
        hotel_name: str = "Hotel CRM",
        filters: AnalyticsFilter | None = None,
    ) -> BytesIO:
        """
        Generate a PDF report from dashboard metrics.

        Args:
            metrics: Dashboard metrics data
            hotel_name: Name of the hotel for the report header

        Returns:
            BytesIO object containing the PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        # Container for the 'Flowable' objects
        elements = []

        # Title
        title = Paragraph(
            f"{hotel_name} - Analytics Report",
            self.styles["CustomTitle"]
        )
        elements.append(title)

        # Period
        period_text = Paragraph(
            f"Period: {metrics.period}",
            self.styles["Normal"]
        )
        elements.append(period_text)

        # Filters summary
        if filters is not None:
            filters_lines = []
            if filters.room_id and filters.room_id != "all":
                filters_lines.append(f"Room: {filters.room_id}")
            if filters.category_id:
                filters_lines.append(f"Category: {filters.category_id}")
            if filters.country_code:
                filters_lines.append(f"Country: {filters.country_code}")
            if filters.region:
                filters_lines.append(f"Region: {filters.region}")
            if filters.district and filters.district != "all":
                filters_lines.append(f"District: {filters.district}")
            if filters.customer_type:
                filters_lines.append(f"Customer Type: {filters.customer_type.value}")
            if filters.tags:
                filters_lines.append(f"Tags: {', '.join(filters.tags)}")
            if filters.include_cancelled:
                filters_lines.append("Include Cancelled: Yes")

            if filters_lines:
                filters_text = Paragraph("Filters: " + "; ".join(filters_lines), self.styles["Normal"])
                elements.append(filters_text)

        # Generated timestamp
        generated_text = Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
            self.styles["Normal"]
        )
        elements.append(generated_text)
        elements.append(Spacer(1, 20))

        # Key Metrics Chart - removed (ChartGenerator not implemented)

        # Revenue Section
        elements.append(Paragraph("Revenue Metrics", self.styles["SectionHeader"]))
        revenue_data = [
            ["Metric", "Value"],
            ["Total Revenue", f"${metrics.revenue.total_revenue:,.2f}"],
            ["Average Daily Rate (ADR)", f"${metrics.revenue.average_daily_rate:,.2f}"],
            ["Revenue per Available Room (RevPAR)", f"${metrics.revenue.revenue_per_available_room:,.2f}"],
            ["Total Bookings", f"{metrics.revenue.total_bookings:,}"],
            ["Total Nights", f"{metrics.revenue.total_nights:,}"],
            ["Discounts Given", f"${metrics.revenue.discount_amount:,.2f}"],
        ]
        revenue_table = self._create_table(revenue_data)
        elements.append(revenue_table)
        elements.append(Spacer(1, 20))

        # Revenue Trend Chart - removed (ChartGenerator not implemented)

        # Occupancy Section
        elements.append(Paragraph("Occupancy Metrics", self.styles["SectionHeader"]))
        occupancy_data = [
            ["Metric", "Value"],
            ["Occupancy Rate", f"{metrics.occupancy.occupancy_rate:.1f}%"],
            ["Average Length of Stay", f"{metrics.occupancy.average_length_of_stay:.1f} nights"],
            ["Available Room Nights", f"{metrics.occupancy.total_available_room_nights:,}"],
            ["Occupied Room Nights", f"{metrics.occupancy.total_occupied_room_nights:,}"],
            ["Check-ins", f"{metrics.occupancy.check_ins:,}"],
            ["Check-outs", f"{metrics.occupancy.check_outs:,}"],
            ["Cancellations", f"{metrics.occupancy.cancellations:,}"],
        ]
        occupancy_table = self._create_table(occupancy_data)
        elements.append(occupancy_table)
        elements.append(Spacer(1, 20))

        # Payment Distribution Section
        elements.append(Paragraph("Payment Method Distribution", self.styles["SectionHeader"]))
        payment_data = [
            ["Payment Method", "Percentage", "Amount"],
            ["Cash", f"{metrics.payment_distribution.cash_percentage:.1f}%", f"${metrics.payment_distribution.cash_amount:,.2f}"],
            ["Transfer", f"{metrics.payment_distribution.transfer_percentage:.1f}%", f"${metrics.payment_distribution.transfer_amount:,.2f}"],
            ["Terminal", f"{metrics.payment_distribution.terminal_percentage:.1f}%", f"${metrics.payment_distribution.terminal_amount:,.2f}"],
        ]
        payment_table = self._create_table(payment_data, col_widths=[2*inch, 1.5*inch, 2*inch])
        elements.append(payment_table)
        elements.append(Spacer(1, 20))

        # Customer Metrics Section
        elements.append(Paragraph("Customer Metrics", self.styles["SectionHeader"]))
        customer_data = [
            ["Metric", "Value"],
            ["Total Customers", f"{metrics.customer_metrics.total_customers:,}"],
            ["New Customers", f"{metrics.customer_metrics.new_customers:,}"],
            ["Returning Customers", f"{metrics.customer_metrics.returning_customers:,}"],
            ["Average Age", f"{metrics.customer_metrics.average_age:.1f} years" if metrics.customer_metrics.average_age else "N/A"],
        ]
        customer_table = self._create_table(customer_data)
        elements.append(customer_table)
        elements.append(Spacer(1, 20))

        # Room Type Breakdown removed

        # Age Distribution (if available)
        if metrics.customer_metrics.age_distribution:
            elements.append(PageBreak())
            elements.append(Paragraph("Customer Age Distribution", self.styles["SectionHeader"]))
            age_data = [["Age Group", "Count"]]
            for age_group, count in metrics.customer_metrics.age_distribution.items():
                if count > 0:  # Only show groups with customers
                    age_data.append([age_group, f"{count:,}"])
            if len(age_data) > 1:  # Only create table if there's data
                age_table = self._create_table(age_data)
                elements.append(age_table)
                elements.append(Spacer(1, 20))

        # District Distribution (if available)
        if metrics.customer_metrics.district_distribution:
            elements.append(Paragraph("Customer District Distribution", self.styles["SectionHeader"]))
            district_data = [["District", "Count"]]
            for district, count in sorted(
                metrics.customer_metrics.district_distribution.items(),
                key=lambda x: x[1],
                reverse=True
            ):
                district_data.append([district.title(), f"{count:,}"])
            if len(district_data) > 1:  # Only create table if there's data
                district_table = self._create_table(district_data)
                elements.append(district_table)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer

    def generate_comprehensive_report(
        self,
        session: Session,
        filters: AnalyticsFilter,
        hotel_name: str = "Hotel CRM",
        include_charts: bool = True,
    ) -> BytesIO:
        """
        Generate a comprehensive PDF report using all analytics endpoints.

        Args:
            session: Database session
            filters: Analytics filters
            hotel_name: Name of the hotel for the report header
            include_charts: Whether to include visualizations

        Returns:
            BytesIO object containing the comprehensive PDF
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )

        # Initialize analytics service
        analytics_service = AnalyticsService(session)

        # Container for the 'Flowable' objects
        elements = []

        # Title
        title = Paragraph(
            f"{hotel_name} - Comprehensive Analytics Report",
            self.styles["CustomTitle"]
        )
        elements.append(title)

        # Period
        period_text = Paragraph(
            f"Period: {filters.date_from.strftime('%Y-%m-%d')} to {filters.date_to.strftime('%Y-%m-%d')}",
            self.styles["Normal"]
        )
        elements.append(period_text)

        # Generated timestamp
        generated_text = Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC",
            self.styles["Normal"]
        )
        elements.append(generated_text)
        elements.append(Spacer(1, 20))

        # Get all analytics data
        try:
            # Dashboard Metrics
            dashboard_metrics = analytics_service.get_dashboard_metrics(filters)
            self._add_dashboard_section(elements, dashboard_metrics, include_charts)

            # Revenue Details
            revenue_details = analytics_service.get_revenue_details(filters, "day")
            self._add_revenue_details_section(elements, revenue_details, include_charts)

            # Occupancy Details
            occupancy_details = analytics_service.get_occupancy_details(filters)
            self._add_occupancy_details_section(elements, occupancy_details)

            # Customer Details
            customer_details = analytics_service.get_customer_details(filters)
            self._add_customer_details_section(elements, customer_details, include_charts)

            # Hourly Distribution
            hourly_checkins = analytics_service.get_hourly_distribution(
                filters.date_from, filters.date_to, "check_ins", filters.room_id, None, filters
            )
            hourly_checkouts = analytics_service.get_hourly_distribution(
                filters.date_from, filters.date_to, "check_outs", filters.room_id, None, filters
            )
            self._add_hourly_patterns_section(elements, hourly_checkins, hourly_checkouts, include_charts)

            # Seasonal Trends
            seasonal_trends = analytics_service.get_seasonal_trends(2, filters.room_id, None, filters)
            self._add_seasonal_trends_section(elements, seasonal_trends, include_charts)

            # Top Customers (by revenue)
            top_customers = analytics_service.get_top_customers(
                limit=20, date_from=filters.date_from, date_to=filters.date_to,
                room_id=filters.room_id, room_type=None, filters=filters
            )
            self._add_top_customers_section(elements, top_customers)

            # District Revenue Breakdown
            district_revenue = analytics_service.get_district_revenue(
                filters.date_from, filters.date_to, filters.room_id, filters
            )
            self._add_district_revenue_section(elements, district_revenue)

            # Room Performance Analysis
            room_performance = analytics_service.get_room_performance(filters, top_n=10)
            self._add_room_performance_section(elements, room_performance)

        except Exception as e:
            # Fallback to basic dashboard if comprehensive fails
            elements.append(Paragraph(f"Note: Using basic report due to data limitation: {str(e)}", self.styles["Normal"]))
            dashboard_metrics = analytics_service.get_dashboard_metrics(filters)
            self._add_dashboard_section(elements, dashboard_metrics, include_charts)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer

    def _add_quick_stats_section(self, elements: list[Any], quick_stats: dict[str, Any]) -> None:
        """Add quick stats section to the report."""
        elements.append(Paragraph("Quick Statistics", self.styles["SectionHeader"]))

        quick_data = [
            ["Period", "Revenue", "Bookings", "Occupancy"],
            ["Today", f"${quick_stats['today']['revenue']:,.2f}",
             f"{quick_stats['today']['bookings']}", f"{quick_stats['today']['occupancy']:.1f}%"],
            ["This Week", f"${quick_stats['week']['revenue']:,.2f}",
             f"{quick_stats['week']['bookings']}", f"{quick_stats['week']['occupancy']:.1f}%"],
            ["This Month", f"${quick_stats['month']['revenue']:,.2f}",
             f"{quick_stats['month']['bookings']}", f"{quick_stats['month']['occupancy']:.1f}%"],
        ]
        quick_table = self._create_table(quick_data, col_widths=[1.3*inch, 1.8*inch, 1.1*inch, 1.3*inch])
        elements.append(quick_table)
        elements.append(Spacer(1, 20))

    def _add_dashboard_section(self, elements: list[Any], metrics: DashboardMetrics, include_charts: bool) -> None:
        """Add dashboard metrics section with key performance indicators."""
        elements.append(Paragraph("Dashboard Overview", self.styles["SectionHeader"]))

        # Revenue Chart
        if include_charts and metrics.revenue_trend:
            try:
                revenue_chart_buffer = self.chart_service.generate_revenue_trend_chart(
                    [{"date": point.date, "value": point.value} for point in metrics.revenue_trend]
                )
                revenue_chart = Image(revenue_chart_buffer, width=6*inch, height=3.6*inch)
                elements.append(revenue_chart)
                elements.append(Spacer(1, 10))
            except Exception:
                pass  # Skip chart if generation fails

        # Key Performance Indicators (KPIs) - unique metrics only
        kpi_data = [
            ["KPI", "Value"],
            ["Average Daily Rate (ADR)", f"${metrics.revenue.average_daily_rate:,.2f}"],
            ["Revenue Per Available Room (RevPAR)", f"${metrics.revenue.revenue_per_available_room:,.2f}"],
        ]
        kpi_table = self._create_table(kpi_data)
        elements.append(kpi_table)
        elements.append(Spacer(1, 15))

        # Payment Distribution Chart
        if include_charts:
            try:
                payment_chart_buffer = self.chart_service.generate_payment_distribution_chart({
                    "cash_percentage": metrics.payment_distribution.cash_percentage,
                    "transfer_percentage": metrics.payment_distribution.transfer_percentage,
                    "terminal_percentage": metrics.payment_distribution.terminal_percentage,
                })
                payment_chart = Image(payment_chart_buffer, width=4*inch, height=4*inch)
                elements.append(payment_chart)
                elements.append(Spacer(1, 10))
            except Exception:
                pass

        # Payment Distribution Table with amounts
        payment_data = [
            ["Payment Method", "Percentage", "Amount"],
            ["Cash", f"{metrics.payment_distribution.cash_percentage:.1f}%", f"${metrics.payment_distribution.cash_amount:,.2f}"],
            ["Bank Transfer", f"{metrics.payment_distribution.transfer_percentage:.1f}%", f"${metrics.payment_distribution.transfer_amount:,.2f}"],
            ["Terminal/Card", f"{metrics.payment_distribution.terminal_percentage:.1f}%", f"${metrics.payment_distribution.terminal_amount:,.2f}"],
        ]
        payment_table = self._create_table(payment_data, col_widths=[2*inch, 1.5*inch, 2*inch])
        elements.append(payment_table)
        elements.append(Spacer(1, 20))

    def _add_revenue_details_section(self, elements: list[Any], revenue_details: dict[str, Any], include_charts: bool) -> None:
        """Add revenue details section."""
        metrics = revenue_details["metrics"]
        trend = revenue_details["trend"]

        section_content = []

        # Revenue trend chart
        if include_charts and trend:
            try:
                trend_chart_buffer = self.chart_service.generate_revenue_trend_chart(trend)
                trend_chart = Image(trend_chart_buffer, width=7*inch, height=4.2*inch)
                section_content.append(trend_chart)
                section_content.append(Spacer(1, 10))
            except Exception:
                pass

        # Detailed revenue metrics
        detailed_data = [
            ["Metric", "Value"],
            ["Total Revenue", f"${metrics['total_revenue']:,.2f}"],
            ["Total Bookings", f"{metrics['booking_count']:,}"],
            ["Total Nights", f"{metrics['total_nights']:,}"],
            ["Discount Amount", f"${metrics['discount_amount']:,.2f}"],
            ["Refund Amount", f"${metrics['refund_amount']:,.2f}"],
        ]
        detailed_table = self._create_table(detailed_data)
        section_content.append(detailed_table)
        section_content.append(Spacer(1, 20))

        # Add section with header kept together with content
        self._add_section_with_header(elements, "Revenue Analysis", section_content)

    def _add_occupancy_details_section(self, elements: list[Any], occupancy_details: dict[str, Any]) -> None:
        """Add occupancy details section."""
        section_content = []

        occupancy_data = [
            ["Metric", "Value"],
            ["Occupancy Rate", f"{occupancy_details['occupancy_rate']}%"],
            ["Avg Length of Stay", f"{occupancy_details['average_length_of_stay']:.1f} nights"],
            ["Available Room Nights", f"{occupancy_details['total_available_room_nights']:,}"],
            ["Occupied Room Nights", f"{occupancy_details['total_occupied_room_nights']:,}"],
            ["Check-ins", f"{occupancy_details['check_ins']:,}"],
            ["Check-outs", f"{occupancy_details['check_outs']:,}"],
            ["Cancellations", f"{occupancy_details['cancellations']:,}"],
        ]
        occupancy_table = self._create_table(occupancy_data)
        section_content.append(occupancy_table)
        section_content.append(Spacer(1, 20))

        self._add_section_with_header(elements, "Occupancy Analysis", section_content)

    def _add_customer_details_section(self, elements: list[Any], customer_details: dict[str, Any], include_charts: bool) -> None:
        """Add customer details section."""
        section_content = []

        # Customer demographics chart
        if include_charts:
            try:
                demographics_chart_buffer = self.chart_service.generate_customer_demographics_chart(
                    customer_details.get("age_distribution", {}),
                    customer_details.get("district_distribution", {})
                )
                demographics_chart = Image(demographics_chart_buffer, width=8*inch, height=4.8*inch)
                section_content.append(demographics_chart)
                section_content.append(Spacer(1, 10))
            except Exception:
                pass

        # Customer metrics
        customer_data = [
            ["Metric", "Value"],
            ["Total Customers", f"{customer_details['total_customers']:,}"],
            ["New Customers", f"{customer_details['new_customers']:,}"],
            ["Returning Customers", f"{customer_details['returning_customers']:,}"],
            ["Average Age", f"{customer_details['average_age']:.1f} years" if customer_details.get('average_age') else "N/A"],
        ]
        customer_table = self._create_table(customer_data)
        section_content.append(customer_table)
        section_content.append(Spacer(1, 20))

        self._add_section_with_header(elements, "Customer Analytics", section_content)

    def _add_hourly_patterns_section(self, elements: list[Any], checkins: list, checkouts: list, include_charts: bool) -> None:
        """Add hourly patterns section."""
        elements.append(PageBreak())
        elements.append(Paragraph("Operational Patterns", self.styles["SectionHeader"]))

        if include_charts:
            # Check-ins hourly chart
            try:
                checkins_chart_buffer = self.chart_service.generate_hourly_distribution_chart(checkins, "check_ins")
                checkins_chart = Image(checkins_chart_buffer, width=7*inch, height=3*inch)
                elements.append(checkins_chart)
                elements.append(Spacer(1, 10))
            except Exception:
                pass

            # Check-outs hourly chart
            try:
                checkouts_chart_buffer = self.chart_service.generate_hourly_distribution_chart(checkouts, "check_outs")
                checkouts_chart = Image(checkouts_chart_buffer, width=7*inch, height=3*inch)
                elements.append(checkouts_chart)
                elements.append(Spacer(1, 10))
            except Exception:
                pass

        # Summary stats
        total_checkins = sum(item['count'] for item in checkins)
        total_checkouts = sum(item['count'] for item in checkouts)

        pattern_data = [
            ["Metric", "Value"],
            ["Total Check-ins", f"{total_checkins:,}"],
            ["Total Check-outs", f"{total_checkouts:,}"],
            ["Peak Check-in Hour", self._find_peak_hour(checkins)],
            ["Peak Check-out Hour", self._find_peak_hour(checkouts)],
        ]
        pattern_table = self._create_table(pattern_data)
        elements.append(pattern_table)
        elements.append(Spacer(1, 20))

    def _add_seasonal_trends_section(self, elements: list, seasonal_data: dict[str, Any], include_charts: bool) -> None:
        """Add seasonal trends section."""
        monthly_trends = seasonal_data.get("monthly_trends", [])
        peak_months = seasonal_data.get("peak_months", [])

        section_content = []

        if include_charts and monthly_trends:
            try:
                seasonal_chart_buffer = self.chart_service.generate_seasonal_trends_chart(monthly_trends)
                seasonal_chart = Image(seasonal_chart_buffer, width=7*inch, height=4.8*inch)
                section_content.append(seasonal_chart)
                section_content.append(Spacer(1, 10))
            except Exception:
                pass

        if peak_months:
            section_content.append(Paragraph("Peak Seasons", self.styles["Normal"]))
            peak_data = [["Month", "Revenue", "Bookings"]]
            for month in peak_months[:5]:  # Top 5
                peak_data.append([
                    month["month_name"],
                    f"${month['revenue']:,.2f}",
                    f"{month['bookings']:,}"
                ])
            peak_table = self._create_table(peak_data)
            section_content.append(peak_table)
            section_content.append(Spacer(1, 20))

        self._add_section_with_header(elements, "Seasonal Trends", section_content)

    def _add_top_customers_section(self, elements: list, top_customers_data: dict[str, Any]) -> None:
        """Add top customers section."""
        elements.append(PageBreak())
        elements.append(Paragraph("Top Customers by Revenue", self.styles["SectionHeader"]))

        top_customers = top_customers_data.get("top_customers", [])

        if top_customers:
            customer_data = [["Rank", "Name", "Total Revenue", "Bookings", "Avg Booking"]]

            for idx, customer in enumerate(top_customers[:20], 1):
                customer_data.append([
                    str(idx),
                    customer.get("name", "N/A")[:25],  # Truncate long names
                    f"${customer.get('total_revenue', 0):,.2f}",
                    f"{customer.get('total_bookings', 0):,}",
                    f"${customer.get('average_booking_value', 0):,.2f}"
                ])

            customer_table = self._create_table(
                customer_data,
                col_widths=[0.5*inch, 2*inch, 1.5*inch, 1*inch, 1.5*inch]
            )
            elements.append(customer_table)
        else:
            elements.append(Paragraph("No customer data available.", self.styles["Normal"]))

        elements.append(Spacer(1, 20))

    def _add_district_revenue_section(self, elements: list, district_data: dict[str, Any]) -> None:
        """Add district revenue breakdown section."""
        elements.append(PageBreak())
        elements.append(Paragraph("Revenue by District", self.styles["SectionHeader"]))

        districts = district_data.get("districts", [])

        if districts:
            # Summary
            summary = district_data.get("summary", {})
            summary_text = f"Total Revenue: ${summary.get('total_revenue', 0):,.2f} | Total Bookings: {summary.get('total_bookings', 0):,} | Districts: {summary.get('district_count', 0)}"
            elements.append(Paragraph(summary_text, self.styles["Normal"]))
            elements.append(Spacer(1, 10))

            # District table
            district_table_data = [["Rank", "District", "Revenue", "% Share", "Bookings", "Avg Booking"]]

            for idx, district in enumerate(districts, 1):
                district_table_data.append([
                    str(idx),
                    district.get("district", "").replace("_", " ").title(),
                    f"${district.get('revenue', 0):,.2f}",
                    f"{district.get('percentage', 0):.1f}%",
                    f"{district.get('bookings', 0):,}",
                    f"${district.get('average_booking_value', 0):,.2f}",
                ])

            district_table = self._create_table(
                district_table_data,
                col_widths=[0.5*inch, 1.8*inch, 1.5*inch, 0.9*inch, 1*inch, 1.3*inch]
            )
            elements.append(district_table)
        else:
            elements.append(Paragraph("No district data available.", self.styles["Normal"]))

        elements.append(Spacer(1, 20))

    def _find_peak_hour(self, hourly_data: list[dict[str, Any]]) -> str:
        """Find the peak hour from hourly data."""
        if not hourly_data:
            return "N/A"

        max_hour = max(hourly_data, key=lambda x: x['count'])
        return f"{max_hour['hour']:02d}:00 ({max_hour['count']} events)"

    def _add_room_performance_section(self, elements: list[Any], room_performance_data: dict[str, Any]) -> None:
        """Add room performance analysis section (similar to district revenue)."""
        elements.append(PageBreak())
        elements.append(Paragraph("Room Performance Analysis", self.styles["SectionHeader"]))

        top_performers = room_performance_data.get("top_performers", [])
        bottom_performers = room_performance_data.get("bottom_performers", [])
        total_rooms = room_performance_data.get("total_rooms_analyzed", 0)

        if total_rooms == 0:
            elements.append(Paragraph("No room performance data available.", self.styles["Normal"]))
            return

        # Summary
        summary_text = f"Total Rooms Analyzed: {total_rooms}"
        elements.append(Paragraph(summary_text, self.styles["Normal"]))
        elements.append(Spacer(1, 10))

        # Top Performers Table
        if top_performers:
            elements.append(Paragraph("Top Performing Rooms (by ADR)", self.styles["Normal"]))
            elements.append(Spacer(1, 5))

            top_table_data = [[
                "Rank", "Room #", "Category", "ADR", "Revenue", "Bookings", "Nights", "Occupancy"
            ]]

            for idx, room in enumerate(top_performers, 1):
                top_table_data.append([
                    str(idx),
                    room.get("room_number", "N/A"),
                    (room.get("category_name") or room.get("category_id") or "").upper(),
                    f"${room.get('adr', 0):,.2f}",
                    f"${room.get('revenue', 0):,.2f}",
                    f"{room.get('bookings', 0):,}",
                    f"{room.get('total_nights', 0):,}",
                    f"{room.get('occupancy_rate', 0):.1f}%",
                ])

            top_table = self._create_table(
                top_table_data,
                col_widths=[0.5*inch, 0.8*inch, 0.8*inch, 1*inch, 1.2*inch, 0.9*inch, 0.8*inch, 1*inch]
            )
            elements.append(top_table)
            elements.append(Spacer(1, 15))

        # Bottom Performers Table
        if bottom_performers:
            elements.append(Paragraph("Underperforming Rooms (by ADR)", self.styles["Normal"]))
            elements.append(Spacer(1, 5))

            bottom_table_data = [[
                "Rank", "Room #", "Category", "ADR", "Revenue", "Bookings", "Nights", "Occupancy"
            ]]

            for idx, room in enumerate(bottom_performers, 1):
                bottom_table_data.append([
                    str(idx),
                    room.get("room_number", "N/A"),
                    (room.get("category_name") or room.get("category_id") or "").upper(),
                    f"${room.get('adr', 0):,.2f}",
                    f"${room.get('revenue', 0):,.2f}",
                    f"{room.get('bookings', 0):,}",
                    f"{room.get('total_nights', 0):,}",
                    f"{room.get('occupancy_rate', 0):.1f}%",
                ])

            bottom_table = self._create_table(
                bottom_table_data,
                col_widths=[0.5*inch, 0.8*inch, 0.8*inch, 1*inch, 1.2*inch, 0.9*inch, 0.8*inch, 1*inch]
            )
            elements.append(bottom_table)

        elements.append(Spacer(1, 20))


    def _create_table(
        self,
        data: list[list[Any]],
        col_widths: list[float] | None = None,
    ) -> Table:
        """
        Create a formatted table.

        Args:
            data: Table data as list of lists
            col_widths: Optional column widths

        Returns:
            Formatted Table object
        """
        table = Table(data, colWidths=col_widths)

        # Table styling
        style = TableStyle([
            # Header row
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
            ("FONTNAME", (0, 0), (-1, 0), self.font_name_bold),
            ("FONTSIZE", (0, 0), (-1, 0), 12),
            ("ALIGN", (0, 0), (-1, 0), "LEFT"),

            # Data rows
            ("FONTNAME", (0, 1), (-1, -1), self.font_name),
            ("FONTSIZE", (0, 1), (-1, -1), 10),
            ("ALIGN", (0, 1), (0, -1), "LEFT"),  # First column left aligned
            ("ALIGN", (1, 1), (-1, -1), "RIGHT"),  # Other columns right aligned

            # Grid
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("LINEBELOW", (0, 0), (-1, 0), 1, colors.HexColor("#9ca3af")),

            # Row background alternating
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),

            # Padding
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])

        table.setStyle(style)
        return table

    def _add_section_with_header(self, elements: list, header_text: str, content_elements: list) -> None:
        """
        Add a section with header and content on a new page.

        Args:
            elements: Main elements list
            header_text: Section header text
            content_elements: List of elements to include in the section
        """
        # Start each major section on a new page
        elements.append(PageBreak())
        elements.append(Paragraph(header_text, self.styles["SectionHeader"]))
        elements.extend(content_elements)

    def generate_comparison_report(
        self,
        comparison_data: dict[str, Any],
        hotel_name: str = "Hotel CRM",
    ) -> BytesIO:
        """
        Generate a PDF report comparing two periods.

        Args:
            comparison_data: Comparison metrics data
            hotel_name: Name of the hotel

        Returns:
            BytesIO object containing the PDF
        """
        # This is a placeholder for future implementation
        # Would generate a comparison report with side-by-side metrics
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        elements = []

        title = Paragraph(
            f"{hotel_name} - Period Comparison Report",
            self.styles["CustomTitle"]
        )
        elements.append(title)

        # Add comparison tables here

        doc.build(elements)
        buffer.seek(0)
        return buffer
