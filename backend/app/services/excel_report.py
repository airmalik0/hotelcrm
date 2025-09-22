"""
Excel report generation service for analytics data.
"""
from datetime import datetime
from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Border, Font, PatternFill, Side

from app.models.analytics import DashboardMetrics


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

        ws["A3"] = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
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

        ws["A2"] = f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
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
