"""
PDF report generation service for analytics.
"""
from datetime import datetime
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models.analytics import DashboardMetrics
from app.services.chart_generator import ChartGenerator


class PDFReportService:
    """Service for generating PDF reports from analytics data."""

    def __init__(self) -> None:
        """Initialize PDF report service."""
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        self.chart_generator = ChartGenerator()

    def _setup_custom_styles(self) -> None:
        """Setup custom styles for the report."""
        # Title style
        self.styles.add(
            ParagraphStyle(
                name="CustomTitle",
                parent=self.styles["Heading1"],
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
                fontSize=14,
                textColor=colors.HexColor("#059669"),
                alignment=2,  # Right alignment
            )
        )

    def generate_dashboard_report(
        self,
        metrics: DashboardMetrics,
        hotel_name: str = "Hotel CRM",
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

        # Generated timestamp
        generated_text = Paragraph(
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            self.styles["Normal"]
        )
        elements.append(generated_text)
        elements.append(Spacer(1, 20))

        # Key Metrics Chart
        try:
            key_metrics_chart = self.chart_generator.generate_key_metrics_chart(metrics)
            elements.append(self._chart_to_image(key_metrics_chart, width=7*inch, height=3.5*inch))
            elements.append(Spacer(1, 20))
        except Exception:
            # If chart generation fails, continue without it
            pass

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

        # Revenue Trend Chart
        if metrics.revenue_trend:
            try:
                revenue_chart = self.chart_generator.generate_revenue_trend_chart(metrics)
                elements.append(self._chart_to_image(revenue_chart, width=6.5*inch, height=4*inch))
                elements.append(Spacer(1, 20))
            except Exception:
                pass

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

        # Room Type Breakdown (if available)
        if metrics.room_type_breakdown:
            elements.append(Paragraph("Performance by Room Type", self.styles["SectionHeader"]))
            room_type_data = [["Room Type", "Revenue", "Bookings", "Occupancy", "Avg Rate"]]
            for room_metrics in metrics.room_type_breakdown:
                room_type_data.append([
                    room_metrics.room_type.title(),
                    f"${room_metrics.revenue:,.2f}",
                    f"{room_metrics.bookings:,}",
                    f"{room_metrics.occupancy_rate:.1f}%",
                    f"${room_metrics.average_rate:,.2f}",
                ])
            room_type_table = self._create_table(
                room_type_data,
                col_widths=[1.5*inch, 1.5*inch, 1*inch, 1*inch, 1.5*inch]
            )
            elements.append(room_type_table)
            elements.append(Spacer(1, 20))

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

    def _chart_to_image(self, chart_bytes: bytes, width: float = 6*inch, height: float = 4*inch) -> Image:
        """
        Convert chart bytes to ReportLab Image.

        Args:
            chart_bytes: PNG bytes from chart generator
            width: Image width
            height: Image height

        Returns:
            ReportLab Image object
        """
        img_buffer = BytesIO(chart_bytes)
        img = Image(img_buffer, width=width, height=height)
        return img

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
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 12),
            ("ALIGN", (0, 0), (-1, 0), "LEFT"),

            # Data rows
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
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
