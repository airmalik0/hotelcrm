"""
Excel report generation service for analytics data.
"""
from datetime import datetime, timezone
from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Border, Font, PatternFill, Side
from sqlmodel import Session

from app.models.analytics import AnalyticsFilter, DashboardMetrics
from app.services.analytics import AnalyticsService


class ExcelReportService:
    """Service for generating Excel reports from analytics data."""

    def __init__(self) -> None:
        """Initialize Excel report service."""
        # Define color schemes
        self.header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        self.header_font = Font(color="FFFFFF", bold=True, size=11)
        self.subheader_fill = PatternFill(start_color="DCE6F1", end_color="DCE6F1", fill_type="solid")
        self.subheader_font = Font(bold=True, size=10)
        self.border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin"),
        )

    def generate_dashboard_report(self, metrics: DashboardMetrics) -> BytesIO:
        """
        Generate comprehensive Excel report with dashboard metrics.

        Args:
            metrics: Dashboard metrics data

        Returns:
            BytesIO buffer containing Excel file
        """
        wb = Workbook()

        # Remove default sheet
        if wb.active:
            wb.remove(wb.active)

        # Create sheets
        self._create_summary_sheet(wb, metrics)
        self._create_revenue_sheet(wb, metrics)
        self._create_occupancy_sheet(wb, metrics)
        self._create_customer_sheet(wb, metrics)
        self._create_payment_sheet(wb, metrics)
        self._create_room_performance_sheet(wb, metrics)

        # Save to buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return buffer

    def generate_comprehensive_report(
        self,
        session: Session,
        filters: AnalyticsFilter,
        include_charts: bool = True,
    ) -> BytesIO:
        """
        Generate comprehensive Excel report using all analytics endpoints.

        Args:
            session: Database session
            filters: Analytics filters
            include_charts: Whether to include charts

        Returns:
            BytesIO buffer containing comprehensive Excel file
        """
        wb = Workbook()

        # Remove default sheet
        if wb.active:
            wb.remove(wb.active)

        # Initialize analytics service
        analytics_service = AnalyticsService(session)

        try:
            # Get all analytics data
            dashboard_metrics = analytics_service.get_dashboard_metrics(filters)
            quick_stats = analytics_service.get_quick_stats()
            revenue_details = analytics_service.get_revenue_details(filters, "day")
            occupancy_details = analytics_service.get_occupancy_details(filters)
            customer_details = analytics_service.get_customer_details(filters)
            hourly_checkins = analytics_service.get_hourly_distribution(
                filters.date_from, filters.date_to, "check_ins"
            )
            hourly_checkouts = analytics_service.get_hourly_distribution(
                filters.date_from, filters.date_to, "check_outs"
            )
            seasonal_trends = analytics_service.get_seasonal_trends(2)
            top_customers = analytics_service.get_top_customers(limit=20, date_from=filters.date_from, date_to=filters.date_to)
            behavior_patterns = analytics_service.get_customer_behavior_patterns(filters.date_from, filters.date_to)

            # Create comprehensive sheets
            self._create_executive_summary_sheet(wb, quick_stats, dashboard_metrics, filters)
            self._create_revenue_analysis_sheet(wb, revenue_details, include_charts)
            self._create_occupancy_analysis_sheet(wb, occupancy_details, include_charts)
            self._create_customer_analytics_sheet(wb, customer_details, include_charts)
            self._create_payment_analysis_sheet(wb, dashboard_metrics.payment_distribution)
            self._create_room_performance_sheet(wb, dashboard_metrics)
            self._create_hourly_patterns_sheet(wb, hourly_checkins, hourly_checkouts, include_charts)
            self._create_seasonal_trends_sheet(wb, seasonal_trends, include_charts)
            self._create_top_customers_sheet(wb, top_customers)
            self._create_behavior_patterns_sheet(wb, behavior_patterns)

        except Exception:
            # Fallback to basic dashboard if comprehensive fails
            dashboard_metrics = analytics_service.get_dashboard_metrics(filters)
            self._create_summary_sheet(wb, dashboard_metrics)
            self._create_revenue_sheet(wb, dashboard_metrics)
            self._create_occupancy_sheet(wb, dashboard_metrics)
            self._create_customer_sheet(wb, dashboard_metrics)
            self._create_payment_sheet(wb, dashboard_metrics)
            self._create_room_performance_sheet(wb, dashboard_metrics)

        # Save to buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return buffer

    def _create_executive_summary_sheet(self, wb: Workbook, quick_stats: dict[str, Any], metrics: DashboardMetrics, filters: AnalyticsFilter) -> None:
        """Create executive summary sheet with key insights."""
        ws = wb.create_sheet("Executive Summary")

        # Title
        ws["A1"] = "Executive Summary - Analytics Report"
        ws["A1"].font = Font(size=18, bold=True)
        ws.merge_cells("A1:F1")

        ws["A2"] = f"Period: {filters.date_from.strftime('%Y-%m-%d')} to {filters.date_to.strftime('%Y-%m-%d')}"
        ws["A2"].font = Font(size=12)
        ws.merge_cells("A2:F2")

        ws["A3"] = f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC"
        ws["A3"].font = Font(size=10, italic=True)
        ws.merge_cells("A3:F3")

        # Quick Stats
        row = 5
        ws[f"A{row}"] = "QUICK STATISTICS"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:D{row}")

        quick_data = [
            ["Period", "Revenue", "Bookings", "Occupancy"],
            ["Today", f"${quick_stats['today']['revenue']:,.2f}",
             f"{quick_stats['today']['bookings']}", f"{quick_stats['today']['occupancy']:.1f}%"],
            ["This Week", f"${quick_stats['week']['revenue']:,.2f}",
             f"{quick_stats['week']['bookings']}", "N/A"],
            ["This Month", f"${quick_stats['month']['revenue']:,.2f}",
             f"{quick_stats['month']['bookings']}", "N/A"],
        ]

        for i, row_data in enumerate(quick_data):
            current_row = row + 1 + i
            for j, value in enumerate(row_data):
                cell = ws.cell(row=current_row, column=j + 1, value=value)
                cell.border = self.border
                if i == 0:  # Header row
                    cell.font = self.header_font
                    cell.fill = self.header_fill

        # Key Performance Indicators
        row += len(quick_data) + 3
        ws[f"A{row}"] = "KEY PERFORMANCE INDICATORS"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:B{row}")

        kpi_data = [
            ["Total Revenue", f"${metrics.revenue.total_revenue:,.2f}"],
            ["Occupancy Rate", f"{metrics.occupancy.occupancy_rate}%"],
            ["Average Daily Rate", f"${metrics.revenue.average_daily_rate:,.2f}"],
            ["RevPAR", f"${metrics.revenue.revenue_per_available_room:,.2f}"],
            ["Total Customers", f"{metrics.customer_metrics.total_customers:,}"],
            ["New Customers", f"{metrics.customer_metrics.new_customers:,}"],
        ]

        for i, (label, value) in enumerate(kpi_data):
            current_row = row + 1 + i
            ws.cell(row=current_row, column=1, value=label).border = self.border
            ws.cell(row=current_row, column=2, value=value).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 15
        ws.column_dimensions["D"].width = 15

    def _create_payment_analysis_sheet(self, wb: Workbook, payment_distribution: Any) -> None:
        """Create payment analysis sheet."""
        ws = wb.create_sheet("Payment Analysis")

        # Header
        ws["A1"] = "Payment Method Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:D1")

        # Payment distribution
        row = 3
        headers = ["Payment Method", "Percentage", "Amount"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        payment_data = [
            ("Cash", f"{payment_distribution.cash_percentage}%", f"${payment_distribution.cash_amount:,.2f}"),
            ("Bank Transfer", f"{payment_distribution.transfer_percentage}%", f"${payment_distribution.transfer_amount:,.2f}"),
            ("Terminal/Card", f"{payment_distribution.terminal_percentage}%", f"${payment_distribution.terminal_amount:,.2f}"),
        ]

        for method, percentage, amount in payment_data:
            row += 1
            ws.cell(row=row, column=1, value=method).border = self.border
            ws.cell(row=row, column=2, value=percentage).border = self.border
            ws.cell(row=row, column=3, value=amount).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 20
        ws.column_dimensions["B"].width = 15
        ws.column_dimensions["C"].width = 20

    def _create_summary_sheet(self, wb: Workbook, metrics: DashboardMetrics) -> None:
        """Create summary sheet with key metrics."""
        ws = wb.create_sheet("Summary")

        # Title
        ws["A1"] = "Analytics Dashboard Report"
        ws["A1"].font = Font(size=16, bold=True)
        ws.merge_cells("A1:D1")

        ws["A2"] = f"Period: {metrics.period}"
        ws["A2"].font = Font(size=12)
        ws.merge_cells("A2:D2")

        ws["A3"] = f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}"
        ws["A3"].font = Font(size=10, italic=True)
        ws.merge_cells("A3:D3")

        # Key Metrics
        row = 5
        ws[f"A{row}"] = "KEY METRICS"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:B{row}")

        metrics_data = [
            ("Total Revenue", f"${metrics.revenue.total_revenue:,.2f}"),
            ("Total Bookings", metrics.revenue.total_bookings),
            ("Average Daily Rate", f"${metrics.revenue.average_daily_rate:,.2f}"),
            ("RevPAR", f"${metrics.revenue.revenue_per_available_room:,.2f}"),
            ("Occupancy Rate", f"{metrics.occupancy.occupancy_rate}%"),
            ("Average Stay Length", f"{metrics.occupancy.average_length_of_stay:.1f} nights"),
            ("Check-ins", metrics.occupancy.check_ins),
            ("Check-outs", metrics.occupancy.check_outs),
            ("Cancellations", metrics.occupancy.cancellations),
            ("Total Customers", metrics.customer_metrics.total_customers),
            ("New Customers", metrics.customer_metrics.new_customers),
            ("Returning Customers", metrics.customer_metrics.returning_customers),
        ]

        for label, value in metrics_data:
            row += 1
            ws[f"A{row}"] = label
            ws[f"B{row}"] = value
            ws[f"A{row}"].border = self.border
            ws[f"B{row}"].border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20

    def _create_revenue_sheet(self, wb: Workbook, metrics: DashboardMetrics) -> None:
        """Create revenue analysis sheet."""
        ws = wb.create_sheet("Revenue")

        # Header
        ws["A1"] = "Revenue Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:D1")

        # Revenue metrics
        row = 3
        headers = ["Metric", "Value"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        revenue_data = [
            ("Total Revenue", f"${metrics.revenue.total_revenue:,.2f}"),
            ("Average Daily Rate", f"${metrics.revenue.average_daily_rate:,.2f}"),
            ("RevPAR", f"${metrics.revenue.revenue_per_available_room:,.2f}"),
            ("Total Bookings", metrics.revenue.total_bookings),
            ("Total Nights Booked", metrics.revenue.total_nights),
            ("Discounts Given", f"${metrics.revenue.discount_amount:,.2f}"),
            ("Refunds Processed", f"${metrics.revenue.refund_amount:,.2f}"),
        ]

        for label, value in revenue_data:
            row += 1
            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=value).border = self.border

        # Revenue trend (if available)
        if metrics.revenue_trend:
            row += 3
            ws.cell(row=row, column=1, value="Revenue Trend")
            ws.cell(row=row, column=1).font = self.subheader_font
            ws.cell(row=row, column=1).fill = self.subheader_fill
            ws.merge_cells(f"A{row}:C{row}")

            row += 1
            trend_headers = ["Date", "Revenue"]
            for col, header in enumerate(trend_headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for point in metrics.revenue_trend:
                row += 1
                ws.cell(row=row, column=1, value=point.date).border = self.border
                ws.cell(row=row, column=2, value=f"${point.value:,.2f}").border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20

    def _create_occupancy_sheet(self, wb: Workbook, metrics: DashboardMetrics) -> None:
        """Create occupancy analysis sheet."""
        ws = wb.create_sheet("Occupancy")

        # Header
        ws["A1"] = "Occupancy Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:D1")

        # Occupancy metrics
        row = 3
        headers = ["Metric", "Value"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        occupancy_data = [
            ("Occupancy Rate", f"{metrics.occupancy.occupancy_rate}%"),
            ("Average Length of Stay", f"{metrics.occupancy.average_length_of_stay:.1f} nights"),
            ("Total Available Room Nights", metrics.occupancy.total_available_room_nights),
            ("Total Occupied Room Nights", metrics.occupancy.total_occupied_room_nights),
            ("Check-ins", metrics.occupancy.check_ins),
            ("Check-outs", metrics.occupancy.check_outs),
            ("Cancellations", metrics.occupancy.cancellations),
            ("Cancellation Rate",
             f"{(metrics.occupancy.cancellations / max(1, metrics.revenue.total_bookings) * 100):.1f}%"),
        ]

        for label, value in occupancy_data:
            row += 1
            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=value).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 30
        ws.column_dimensions["B"].width = 20

    def _create_customer_sheet(self, wb: Workbook, metrics: DashboardMetrics) -> None:
        """Create customer analysis sheet."""
        ws = wb.create_sheet("Customers")

        # Header
        ws["A1"] = "Customer Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:D1")

        # Customer metrics
        row = 3
        headers = ["Metric", "Value"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        customer_data = [
            ("Total Customers", metrics.customer_metrics.total_customers),
            ("New Customers", metrics.customer_metrics.new_customers),
            ("Returning Customers", metrics.customer_metrics.returning_customers),
            ("Average Age", f"{metrics.customer_metrics.average_age:.1f} years"
             if metrics.customer_metrics.average_age else "N/A"),
        ]

        for label, value in customer_data:
            row += 1
            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=value).border = self.border

        # Age distribution
        if metrics.customer_metrics.age_distribution:
            row += 3
            ws.cell(row=row, column=1, value="Age Distribution")
            ws.cell(row=row, column=1).font = self.subheader_font
            ws.cell(row=row, column=1).fill = self.subheader_fill
            ws.merge_cells(f"A{row}:C{row}")

            row += 1
            age_headers = ["Age Group", "Count"]
            for col, header in enumerate(age_headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for age_group, count in metrics.customer_metrics.age_distribution.items():
                row += 1
                ws.cell(row=row, column=1, value=age_group).border = self.border
                ws.cell(row=row, column=2, value=count).border = self.border

        # District distribution
        if metrics.customer_metrics.district_distribution:
            row += 3
            ws.cell(row=row, column=1, value="District Distribution")
            ws.cell(row=row, column=1).font = self.subheader_font
            ws.cell(row=row, column=1).fill = self.subheader_fill
            ws.merge_cells(f"A{row}:C{row}")

            row += 1
            district_headers = ["District", "Customers"]
            for col, header in enumerate(district_headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for district, count in metrics.customer_metrics.district_distribution.items():
                row += 1
                ws.cell(row=row, column=1, value=district).border = self.border
                ws.cell(row=row, column=2, value=count).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20

    def _create_payment_sheet(self, wb: Workbook, metrics: DashboardMetrics) -> None:
        """Create payment analysis sheet."""
        ws = wb.create_sheet("Payment Methods")

        # Header
        ws["A1"] = "Payment Method Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:D1")

        # Payment distribution
        row = 3
        headers = ["Payment Method", "Percentage", "Amount"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        payment_data = [
            ("Cash",
             f"{metrics.payment_distribution.cash_percentage}%",
             f"${metrics.payment_distribution.cash_amount:,.2f}"),
            ("Bank Transfer",
             f"{metrics.payment_distribution.transfer_percentage}%",
             f"${metrics.payment_distribution.transfer_amount:,.2f}"),
            ("Terminal/Card",
             f"{metrics.payment_distribution.terminal_percentage}%",
             f"${metrics.payment_distribution.terminal_amount:,.2f}"),
        ]

        for method, percentage, amount in payment_data:
            row += 1
            ws.cell(row=row, column=1, value=method).border = self.border
            ws.cell(row=row, column=2, value=percentage).border = self.border
            ws.cell(row=row, column=3, value=amount).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 20
        ws.column_dimensions["B"].width = 15
        ws.column_dimensions["C"].width = 20

    def _create_room_performance_sheet(self, wb: Workbook, metrics: DashboardMetrics) -> None:
        """Create room type performance sheet."""
        ws = wb.create_sheet("Room Performance")

        # Header
        ws["A1"] = "Room Type Performance"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:E1")

        if metrics.room_type_breakdown:
            row = 3
            headers = ["Room Type", "Revenue", "Bookings", "Occupancy Rate", "Average Rate"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for room in metrics.room_type_breakdown:
                row += 1
                ws.cell(row=row, column=1, value=room.room_type.title()).border = self.border
                ws.cell(row=row, column=2, value=f"${room.revenue:,.2f}").border = self.border
                ws.cell(row=row, column=3, value=room.bookings).border = self.border
                ws.cell(row=row, column=4, value=f"{room.occupancy_rate}%").border = self.border
                ws.cell(row=row, column=5, value=f"${room.average_rate:,.2f}").border = self.border

            # Calculate totals
            row += 1
            ws.cell(row=row, column=1, value="TOTAL").font = Font(bold=True)
            ws.cell(row=row, column=1).border = self.border

            total_revenue = sum(room.revenue for room in metrics.room_type_breakdown)
            total_bookings = sum(room.bookings for room in metrics.room_type_breakdown)

            ws.cell(row=row, column=2, value=f"${total_revenue:,.2f}").font = Font(bold=True)
            ws.cell(row=row, column=2).border = self.border
            ws.cell(row=row, column=3, value=total_bookings).font = Font(bold=True)
            ws.cell(row=row, column=3).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 15
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 15
        ws.column_dimensions["D"].width = 20
        ws.column_dimensions["E"].width = 20

    def generate_custom_report(self, data: dict[str, Any], title: str = "Analytics Report") -> BytesIO:
        """
        Generate custom Excel report from arbitrary data.

        Args:
            data: Dictionary containing report data
            title: Report title

        Returns:
            BytesIO buffer containing Excel file
        """
        wb = Workbook()
        ws = wb.active
        if ws is None:
            ws = wb.create_sheet("Report")
        else:
            ws.title = "Report"

        # Title
        ws["A1"] = title
        ws["A1"].font = Font(size=16, bold=True)
        ws.merge_cells("A1:D1")

        ws["A2"] = f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}"
        ws["A2"].font = Font(size=10, italic=True)
        ws.merge_cells("A2:D2")

        # Write data (simplified - could be enhanced)
        row = 4
        for key, value in data.items():
            ws.cell(row=row, column=1, value=str(key))
            ws.cell(row=row, column=2, value=str(value))
            row += 1

        # Save to buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)

        return buffer

    def _create_revenue_analysis_sheet(self, wb: Workbook, revenue_details: dict[str, Any], include_charts: bool = True) -> None:
        """Create detailed revenue analysis sheet."""
        ws = wb.create_sheet("Revenue Analysis")

        # Header
        ws["A1"] = "Revenue Analysis - Detailed Breakdown"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:F1")

        # Overview metrics
        row = 3
        ws[f"A{row}"] = "REVENUE OVERVIEW"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:C{row}")

        revenue_metrics = [
            ("Total Revenue", f"${revenue_details.get('total_revenue', 0):,.2f}"),
            ("Period Growth", f"{revenue_details.get('growth_rate', 0):+.1f}%"),
            ("Average Daily Revenue", f"${revenue_details.get('avg_daily', 0):,.2f}"),
            ("Peak Day Revenue", f"${revenue_details.get('peak_day', 0):,.2f}"),
        ]

        for label, value in revenue_metrics:
            row += 1
            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=value).border = self.border

        # Daily revenue trend
        if 'daily_trend' in revenue_details:
            row += 3
            ws[f"A{row}"] = "DAILY REVENUE TREND"
            ws[f"A{row}"].font = self.header_font
            ws[f"A{row}"].fill = self.header_fill
            ws.merge_cells(f"A{row}:C{row}")

            row += 1
            headers = ["Date", "Revenue", "Growth %"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for day_data in revenue_details.get('daily_trend', []):
                row += 1
                ws.cell(row=row, column=1, value=day_data.get('date', '')).border = self.border
                ws.cell(row=row, column=2, value=f"${day_data.get('revenue', 0):,.2f}").border = self.border
                ws.cell(row=row, column=3, value=f"{day_data.get('growth', 0):+.1f}%").border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 15

    def _create_occupancy_analysis_sheet(self, wb: Workbook, occupancy_details: dict[str, Any], include_charts: bool = True) -> None:
        """Create detailed occupancy analysis sheet."""
        ws = wb.create_sheet("Occupancy Analysis")

        # Header
        ws["A1"] = "Occupancy Analysis - Detailed Breakdown"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:F1")

        # Overview metrics
        row = 3
        ws[f"A{row}"] = "OCCUPANCY OVERVIEW"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:C{row}")

        occupancy_metrics = [
            ("Average Occupancy Rate", f"{occupancy_details.get('avg_occupancy', 0):.1f}%"),
            ("Peak Occupancy Rate", f"{occupancy_details.get('peak_occupancy', 0):.1f}%"),
            ("Average Length of Stay", f"{occupancy_details.get('avg_los', 0):.1f} nights"),
            ("Total Room Nights", f"{occupancy_details.get('total_nights', 0):,}"),
        ]

        for label, value in occupancy_metrics:
            row += 1
            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=value).border = self.border

        # Daily occupancy trend
        if 'daily_trend' in occupancy_details:
            row += 3
            ws[f"A{row}"] = "DAILY OCCUPANCY TREND"
            ws[f"A{row}"].font = self.header_font
            ws[f"A{row}"].fill = self.header_fill
            ws.merge_cells(f"A{row}:D{row}")

            row += 1
            headers = ["Date", "Occupancy %", "Rooms Occupied", "Rooms Available"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for day_data in occupancy_details.get('daily_trend', []):
                row += 1
                ws.cell(row=row, column=1, value=day_data.get('date', '')).border = self.border
                ws.cell(row=row, column=2, value=f"{day_data.get('occupancy', 0):.1f}%").border = self.border
                ws.cell(row=row, column=3, value=day_data.get('occupied', 0)).border = self.border
                ws.cell(row=row, column=4, value=day_data.get('available', 0)).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 15
        ws.column_dimensions["D"].width = 15

    def _create_customer_analytics_sheet(self, wb: Workbook, customer_details: dict[str, Any], include_charts: bool = True) -> None:
        """Create detailed customer analytics sheet."""
        ws = wb.create_sheet("Customer Analytics")

        # Header
        ws["A1"] = "Customer Analytics - Detailed Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:F1")

        # Overview metrics
        row = 3
        ws[f"A{row}"] = "CUSTOMER OVERVIEW"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:C{row}")

        customer_metrics = [
            ("Total Customers", f"{customer_details.get('total_customers', 0):,}"),
            ("New Customers", f"{customer_details.get('new_customers', 0):,}"),
            ("Returning Customers", f"{customer_details.get('returning_customers', 0):,}"),
            ("Average Customer Value", f"${customer_details.get('avg_value', 0):,.2f}"),
        ]

        for label, value in customer_metrics:
            row += 1
            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=value).border = self.border

        # Customer acquisition trend
        if 'acquisition_trend' in customer_details:
            row += 3
            ws[f"A{row}"] = "CUSTOMER ACQUISITION TREND"
            ws[f"A{row}"].font = self.header_font
            ws[f"A{row}"].fill = self.header_fill
            ws.merge_cells(f"A{row}:D{row}")

            row += 1
            headers = ["Date", "New Customers", "Total Value", "Avg Value"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for day_data in customer_details.get('acquisition_trend', []):
                row += 1
                ws.cell(row=row, column=1, value=day_data.get('date', '')).border = self.border
                ws.cell(row=row, column=2, value=day_data.get('new_customers', 0)).border = self.border
                ws.cell(row=row, column=3, value=f"${day_data.get('total_value', 0):,.2f}").border = self.border
                ws.cell(row=row, column=4, value=f"${day_data.get('avg_value', 0):,.2f}").border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 15
        ws.column_dimensions["D"].width = 15

    def _create_hourly_patterns_sheet(self, wb: Workbook, hourly_checkins: dict[str, Any], hourly_checkouts: dict[str, Any], include_charts: bool = True) -> None:
        """Create hourly patterns analysis sheet."""
        ws = wb.create_sheet("Hourly Patterns")

        # Header
        ws["A1"] = "Hourly Patterns Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:F1")

        # Check-in patterns
        row = 3
        ws[f"A{row}"] = "CHECK-IN PATTERNS"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:C{row}")

        row += 1
        headers = ["Hour", "Check-ins", "Percentage"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        for hour_data in hourly_checkins.get('hourly_data', []):
            row += 1
            ws.cell(row=row, column=1, value=f"{hour_data.get('hour', 0):02d}:00").border = self.border
            ws.cell(row=row, column=2, value=hour_data.get('count', 0)).border = self.border
            ws.cell(row=row, column=3, value=f"{hour_data.get('percentage', 0):.1f}%").border = self.border

        # Check-out patterns
        row += 3
        ws[f"A{row}"] = "CHECK-OUT PATTERNS"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:C{row}")

        row += 1
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        for hour_data in hourly_checkouts.get('hourly_data', []):
            row += 1
            ws.cell(row=row, column=1, value=f"{hour_data.get('hour', 0):02d}:00").border = self.border
            ws.cell(row=row, column=2, value=hour_data.get('count', 0)).border = self.border
            ws.cell(row=row, column=3, value=f"{hour_data.get('percentage', 0):.1f}%").border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 15
        ws.column_dimensions["B"].width = 15
        ws.column_dimensions["C"].width = 15

    def _create_seasonal_trends_sheet(self, wb: Workbook, seasonal_trends: dict[str, Any], include_charts: bool = True) -> None:
        """Create seasonal trends analysis sheet."""
        ws = wb.create_sheet("Seasonal Trends")

        # Header
        ws["A1"] = "Seasonal Trends Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:F1")

        # Monthly trends
        row = 3
        ws[f"A{row}"] = "MONTHLY TRENDS"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:E{row}")

        row += 1
        headers = ["Month", "Revenue", "Bookings", "Occupancy", "Avg Rate"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        for month_data in seasonal_trends.get('monthly_data', []):
            row += 1
            ws.cell(row=row, column=1, value=month_data.get('month', '')).border = self.border
            ws.cell(row=row, column=2, value=f"${month_data.get('revenue', 0):,.2f}").border = self.border
            ws.cell(row=row, column=3, value=month_data.get('bookings', 0)).border = self.border
            ws.cell(row=row, column=4, value=f"{month_data.get('occupancy', 0):.1f}%").border = self.border
            ws.cell(row=row, column=5, value=f"${month_data.get('avg_rate', 0):,.2f}").border = self.border

        # Seasonal patterns
        if 'seasonal_patterns' in seasonal_trends:
            row += 3
            ws[f"A{row}"] = "SEASONAL PATTERNS"
            ws[f"A{row}"].font = self.header_font
            ws[f"A{row}"].fill = self.header_fill
            ws.merge_cells(f"A{row}:C{row}")

            row += 1
            pattern_headers = ["Season", "Performance", "Trend"]
            for col, header in enumerate(pattern_headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for pattern in seasonal_trends.get('seasonal_patterns', []):
                row += 1
                ws.cell(row=row, column=1, value=pattern.get('season', '')).border = self.border
                ws.cell(row=row, column=2, value=pattern.get('performance', '')).border = self.border
                ws.cell(row=row, column=3, value=pattern.get('trend', '')).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 15
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 15
        ws.column_dimensions["D"].width = 15
        ws.column_dimensions["E"].width = 15

    def _create_top_customers_sheet(self, wb: Workbook, top_customers_data: dict[str, Any]) -> None:
        """Create top customers sheet."""
        ws = wb.create_sheet("Top Customers")

        # Header
        ws["A1"] = "Top Customers by Revenue"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:F1")

        # Top customers table
        row = 3
        ws[f"A{row}"] = "TOP CUSTOMERS"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:F{row}")

        row += 1
        headers = ["Rank", "Name", "Total Revenue", "Bookings", "Avg Booking", "Period Revenue"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = self.header_font
            cell.fill = self.header_fill
            cell.border = self.border

        top_customers = top_customers_data.get('top_customers', [])
        for idx, customer in enumerate(top_customers, 1):
            row += 1
            ws.cell(row=row, column=1, value=idx).border = self.border
            ws.cell(row=row, column=2, value=customer.get('name', 'N/A')).border = self.border
            ws.cell(row=row, column=3, value=f"${customer.get('total_revenue', 0):,.2f}").border = self.border
            ws.cell(row=row, column=4, value=customer.get('total_bookings', 0)).border = self.border
            ws.cell(row=row, column=5, value=f"${customer.get('average_booking_value', 0):,.2f}").border = self.border
            ws.cell(row=row, column=6, value=f"${customer.get('period_revenue', 0):,.2f}").border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 8
        ws.column_dimensions["B"].width = 30
        ws.column_dimensions["C"].width = 18
        ws.column_dimensions["D"].width = 12
        ws.column_dimensions["E"].width = 18
        ws.column_dimensions["F"].width = 18

    def _create_customer_ltv_sheet(self, wb: Workbook, customer_ltv: dict[str, Any], include_charts: bool = True) -> None:
        """Create customer lifetime value analysis sheet."""
        ws = wb.create_sheet("Customer LTV")

        # Header
        ws["A1"] = "Customer Lifetime Value Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:F1")

        # LTV overview
        row = 3
        ws[f"A{row}"] = "LIFETIME VALUE OVERVIEW"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:C{row}")

        ltv_metrics = [
            ("Average LTV", f"${customer_ltv.get('avg_ltv', 0):,.2f}"),
            ("Median LTV", f"${customer_ltv.get('median_ltv', 0):,.2f}"),
            ("Top 10% Average", f"${customer_ltv.get('top_10_avg', 0):,.2f}"),
            ("Total Customer Value", f"${customer_ltv.get('total_value', 0):,.2f}"),
        ]

        for label, value in ltv_metrics:
            row += 1
            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=value).border = self.border

        # LTV distribution
        if 'ltv_distribution' in customer_ltv:
            row += 3
            ws[f"A{row}"] = "LTV DISTRIBUTION"
            ws[f"A{row}"].font = self.header_font
            ws[f"A{row}"].fill = self.header_fill
            ws.merge_cells(f"A{row}:E{row}")

            row += 1
            headers = ["LTV Range", "Customers", "Total Value", "Avg Visits", "Percentage"]
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for dist in customer_ltv.get('ltv_distribution', []):
                row += 1
                ws.cell(row=row, column=1, value=dist.get('range', '')).border = self.border
                ws.cell(row=row, column=2, value=dist.get('customers', 0)).border = self.border
                ws.cell(row=row, column=3, value=f"${dist.get('total_value', 0):,.2f}").border = self.border
                ws.cell(row=row, column=4, value=f"{dist.get('avg_visits', 0):.1f}").border = self.border
                ws.cell(row=row, column=5, value=f"{dist.get('percentage', 0):.1f}%").border = self.border

        # Top customers
        if 'top_customers' in customer_ltv:
            row += 3
            ws[f"A{row}"] = "TOP CUSTOMERS BY LTV"
            ws[f"A{row}"].font = self.header_font
            ws[f"A{row}"].fill = self.header_fill
            ws.merge_cells(f"A{row}:E{row}")

            row += 1
            top_headers = ["Customer", "LTV", "Total Bookings", "Avg Booking", "Last Visit"]
            for col, header in enumerate(top_headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for customer in customer_ltv.get('top_customers', []):
                row += 1
                ws.cell(row=row, column=1, value=customer.get('name', '')).border = self.border
                ws.cell(row=row, column=2, value=f"${customer.get('ltv', 0):,.2f}").border = self.border
                ws.cell(row=row, column=3, value=customer.get('bookings', 0)).border = self.border
                ws.cell(row=row, column=4, value=f"${customer.get('avg_booking', 0):,.2f}").border = self.border
                ws.cell(row=row, column=5, value=customer.get('last_visit', '')).border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 15
        ws.column_dimensions["D"].width = 15
        ws.column_dimensions["E"].width = 15

    def _create_behavior_patterns_sheet(self, wb: Workbook, behavior_patterns: dict[str, Any]) -> None:
        """Create customer behavior patterns analysis sheet."""
        ws = wb.create_sheet("Behavior Patterns")

        # Header
        ws["A1"] = "Customer Behavior Patterns Analysis"
        ws["A1"].font = Font(size=14, bold=True)
        ws.merge_cells("A1:F1")

        # Booking patterns
        row = 3
        ws[f"A{row}"] = "BOOKING PATTERNS"
        ws[f"A{row}"].font = self.header_font
        ws[f"A{row}"].fill = self.header_fill
        ws.merge_cells(f"A{row}:D{row}")

        booking_metrics = [
            ("Average Advance Booking", f"{behavior_patterns.get('avg_advance_days', 0):.1f} days"),
            ("Peak Booking Day", behavior_patterns.get('peak_booking_day', 'N/A')),
            ("Average Stay Duration", f"{behavior_patterns.get('avg_stay_duration', 0):.1f} nights"),
            ("Most Popular Room Type", behavior_patterns.get('popular_room_type', 'N/A')),
        ]

        for label, value in booking_metrics:
            row += 1
            ws.cell(row=row, column=1, value=label).border = self.border
            ws.cell(row=row, column=2, value=value).border = self.border

        # Payment preferences
        if 'payment_preferences' in behavior_patterns:
            row += 3
            ws[f"A{row}"] = "PAYMENT PREFERENCES"
            ws[f"A{row}"].font = self.header_font
            ws[f"A{row}"].fill = self.header_fill
            ws.merge_cells(f"A{row}:C{row}")

            row += 1
            payment_headers = ["Payment Method", "Usage %", "Avg Amount"]
            for col, header in enumerate(payment_headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for payment in behavior_patterns.get('payment_preferences', []):
                row += 1
                ws.cell(row=row, column=1, value=payment.get('method', '')).border = self.border
                ws.cell(row=row, column=2, value=f"{payment.get('percentage', 0):.1f}%").border = self.border
                ws.cell(row=row, column=3, value=f"${payment.get('avg_amount', 0):,.2f}").border = self.border

        # Seasonal preferences
        if 'seasonal_preferences' in behavior_patterns:
            row += 3
            ws[f"A{row}"] = "SEASONAL PREFERENCES"
            ws[f"A{row}"].font = self.header_font
            ws[f"A{row}"].fill = self.header_fill
            ws.merge_cells(f"A{row}:C{row}")

            row += 1
            seasonal_headers = ["Season", "Bookings", "Percentage"]
            for col, header in enumerate(seasonal_headers, 1):
                cell = ws.cell(row=row, column=col, value=header)
                cell.font = self.header_font
                cell.fill = self.header_fill
                cell.border = self.border

            for season in behavior_patterns.get('seasonal_preferences', []):
                row += 1
                ws.cell(row=row, column=1, value=season.get('season', '')).border = self.border
                ws.cell(row=row, column=2, value=season.get('bookings', 0)).border = self.border
                ws.cell(row=row, column=3, value=f"{season.get('percentage', 0):.1f}%").border = self.border

        # Adjust column widths
        ws.column_dimensions["A"].width = 25
        ws.column_dimensions["B"].width = 20
        ws.column_dimensions["C"].width = 15
