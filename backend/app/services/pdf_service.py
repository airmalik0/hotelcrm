import io
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
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


class PDFService:
    def __init__(self) -> None:
        self.page_size = letter
        self.margins = {
            "leftMargin": inch,
            "rightMargin": inch,
            "topMargin": inch,
            "bottomMargin": inch,
        }
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self) -> None:
        """Setup custom paragraph styles."""
        self.styles.add(
            ParagraphStyle(
                name="CustomTitle",
                parent=self.styles["Title"],
                fontSize=24,
                textColor=colors.HexColor("#2563EB"),
                spaceAfter=30,
            )
        )

        self.styles.add(
            ParagraphStyle(
                name="CustomHeading",
                parent=self.styles["Heading1"],
                fontSize=16,
                textColor=colors.HexColor("#1F2937"),
                spaceAfter=12,
            )
        )

        self.styles.add(
            ParagraphStyle(
                name="CustomSubHeading",
                parent=self.styles["Heading2"],
                fontSize=14,
                textColor=colors.HexColor("#4B5563"),
                spaceAfter=10,
            )
        )

    def _create_header_footer(self, canvas: Any, doc: Any) -> None:
        """Add header and footer to each page."""
        canvas.saveState()

        # Header
        canvas.setFont("Helvetica-Bold", 10)
        canvas.setFillColor(colors.HexColor("#2563EB"))
        canvas.drawString(inch, self.page_size[1] - 0.5 * inch, "Hotel CRM Reports")

        # Footer
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawString(
            inch,
            0.5 * inch,
            f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        )

        # Page number
        page_num = canvas.getPageNumber()
        canvas.drawRightString(
            self.page_size[0] - inch,
            0.5 * inch,
            f"Page {page_num}",
        )

        canvas.restoreState()

    async def create_occupancy_report_pdf(
        self,
        data: list[dict[str, Any]],
        chart_image: bytes | None = None,
        title: str = "Occupancy Report"
    ) -> bytes:
        """Create PDF for occupancy report."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=self.page_size, **self.margins)

        story = []

        # Title
        story.append(Paragraph(title, self.styles["CustomTitle"]))
        story.append(Spacer(1, 12))

        # Summary statistics
        if data:
            total_bookings = sum(d.get("total_bookings", 0) for d in data)
            avg_occupancy = sum(d.get("occupancy_rate", 0) for d in data) / len(data)

            summary_data = [
                ["Metric", "Value"],
                ["Total Periods", str(len(data))],
                ["Total Bookings", str(total_bookings)],
                ["Average Occupancy Rate", f"{avg_occupancy:.2f}%"],
            ]

            summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
            summary_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ])
            )

            story.append(Paragraph("Summary", self.styles["CustomHeading"]))
            story.append(Spacer(1, 6))
            story.append(summary_table)
            story.append(Spacer(1, 20))

        # Chart image if provided
        if chart_image:
            img_buffer = io.BytesIO(chart_image)
            img = Image(img_buffer, width=6 * inch, height=3.6 * inch)
            story.append(Paragraph("Occupancy Trend", self.styles["CustomHeading"]))
            story.append(Spacer(1, 6))
            story.append(img)
            story.append(PageBreak())

        # Detailed data table
        if data:
            story.append(Paragraph("Detailed Data", self.styles["CustomHeading"]))
            story.append(Spacer(1, 6))

            # Prepare table data
            table_data = [["Period", "Bookings", "Rooms", "Occupancy %"]]
            for row in data[:50]:  # Limit to 50 rows for PDF
                table_data.append([
                    row.get("period_label", ""),
                    str(row.get("total_bookings", 0)),
                    str(row.get("unique_rooms", 0)),
                    f"{row.get('occupancy_rate', 0):.2f}%",
                ])

            detail_table = Table(table_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch])
            detail_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                ])
            )
            story.append(detail_table)

        # Build PDF
        doc.build(story, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)

        buffer.seek(0)
        return buffer.read()

    async def create_revenue_report_pdf(
        self,
        data: list[dict[str, Any]],
        chart_image: bytes | None = None,
        title: str = "Revenue Report"
    ) -> bytes:
        """Create PDF for revenue report."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=self.page_size, **self.margins)

        story = []

        # Title
        story.append(Paragraph(title, self.styles["CustomTitle"]))
        story.append(Spacer(1, 12))

        # Financial summary
        if data:
            total_revenue = sum(d.get("total_revenue", 0) for d in data)
            total_bookings = sum(d.get("booking_count", 0) for d in data)
            avg_booking_value = total_revenue / total_bookings if total_bookings > 0 else 0

            summary_data = [
                ["Metric", "Value"],
                ["Total Revenue", f"${total_revenue:,.2f}"],
                ["Total Bookings", str(total_bookings)],
                ["Average Booking Value", f"${avg_booking_value:,.2f}"],
                ["Reporting Periods", str(len(data))],
            ]

            summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
            summary_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 12),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.lightgreen),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ])
            )

            story.append(Paragraph("Financial Summary", self.styles["CustomHeading"]))
            story.append(Spacer(1, 6))
            story.append(summary_table)
            story.append(Spacer(1, 20))

        # Chart image if provided
        if chart_image:
            img_buffer = io.BytesIO(chart_image)
            img = Image(img_buffer, width=6 * inch, height=3.6 * inch)
            story.append(Paragraph("Revenue Trend", self.styles["CustomHeading"]))
            story.append(Spacer(1, 6))
            story.append(img)
            story.append(PageBreak())

        # Detailed revenue table
        if data:
            story.append(Paragraph("Period Details", self.styles["CustomHeading"]))
            story.append(Spacer(1, 6))

            table_data = [["Period", "Revenue", "Bookings", "Avg Value"]]
            for row in data[:50]:  # Limit to 50 rows
                table_data.append([
                    row.get("period_label", ""),
                    f"${row.get('total_revenue', 0):,.2f}",
                    str(row.get("booking_count", 0)),
                    f"${row.get('avg_booking_value', 0):,.2f}",
                ])

            detail_table = Table(table_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch])
            detail_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#10B981")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.lightgreen),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                ])
            )
            story.append(detail_table)

        # Build PDF
        doc.build(story, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)

        buffer.seek(0)
        return buffer.read()

    async def create_customer_report_pdf(
        self,
        data: list[dict[str, Any]],
        title: str = "Customer Report"
    ) -> bytes:
        """Create PDF for customer report."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=self.page_size, **self.margins)

        story = []

        # Title
        story.append(Paragraph(title, self.styles["CustomTitle"]))
        story.append(Spacer(1, 12))

        # Customer table
        if data:
            story.append(Paragraph("Top Customers", self.styles["CustomHeading"]))
            story.append(Spacer(1, 6))

            table_data = [["Name", "Phone", "District", "Revenue", "Bookings"]]
            for row in data[:20]:  # Limit to top 20
                table_data.append([
                    row.get("full_name", ""),
                    row.get("phone", ""),
                    row.get("district", "N/A"),
                    f"${row.get('total_revenue', 0):,.2f}",
                    str(row.get("booking_count", 0)),
                ])

            customer_table = Table(
                table_data,
                colWidths=[2 * inch, 1.5 * inch, 1.5 * inch, 1.2 * inch, 0.8 * inch]
            )
            customer_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F59E0B")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.lightyellow),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                ])
            )
            story.append(customer_table)

        # Build PDF
        doc.build(story, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)

        buffer.seek(0)
        return buffer.read()

    async def create_analytics_report_pdf(
        self,
        data: list[dict[str, Any]],
        title: str = "Analytics Report",
        chart_image: bytes | None = None
    ) -> bytes:
        """Create generic analytics PDF report."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=self.page_size, **self.margins)
        
        story = []
        
        # Title
        story.append(Paragraph(title, self.styles["CustomTitle"]))
        story.append(Spacer(1, 12))
        story.append(
            Paragraph(
                f"Generated on {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}",
                self.styles["Normal"]
            )
        )
        story.append(Spacer(1, 24))
        
        # Add chart if provided
        if chart_image:
            img = Image(io.BytesIO(chart_image), width=6*inch, height=4*inch)
            story.append(img)
            story.append(Spacer(1, 12))
        
        # Add data table
        if data:
            # Create table based on first row keys
            if data[0]:
                headers = list(data[0].keys())
                table_data = [headers]
                
                for row in data:
                    table_row = []
                    for header in headers:
                        value = row.get(header, "")
                        # Format numbers
                        if isinstance(value, (int, float)):
                            if "amount" in header.lower() or "revenue" in header.lower():
                                table_row.append(f"${value:,.2f}")
                            elif "rate" in header.lower() or "percentage" in header.lower():
                                table_row.append(f"{value:.1f}%")
                            else:
                                table_row.append(str(value))
                        else:
                            table_row.append(str(value))
                    table_data.append(table_row)
                
                # Create table with dynamic column widths
                col_count = len(headers)
                col_width = 7.0 / col_count * inch
                
                table = Table(table_data, colWidths=[col_width] * col_count)
                table.setStyle(
                    TableStyle([
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563EB")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 9),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                        ("GRID", (0, 0), (-1, -1), 1, colors.black),
                        ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ])
                )
                story.append(table)
        else:
            story.append(Paragraph("No data available for this report.", self.styles["Normal"]))
        
        doc.build(story)
        return buffer.getvalue()
    
    async def create_geographic_report_pdf(
        self,
        data: list[dict[str, Any]],
        chart_image: bytes | None = None
    ) -> bytes:
        """Create geographic analysis PDF report."""
        return await self.create_analytics_report_pdf(
            data, 
            "Geographic Analysis Report",
            chart_image
        )

    async def create_comprehensive_report_pdf(
        self,
        occupancy_data: list[dict[str, Any]] | None = None,
        revenue_data: list[dict[str, Any]] | None = None,
        customer_data: list[dict[str, Any]] | None = None,
        charts: dict[str, bytes] | None = None,
    ) -> bytes:
        """Create comprehensive PDF report with multiple sections."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=self.page_size, **self.margins)

        story = []

        # Title page
        story.append(Paragraph("Hotel CRM", self.styles["CustomTitle"]))
        story.append(Paragraph("Comprehensive Report", self.styles["CustomHeading"]))
        story.append(Spacer(1, 12))
        story.append(
            Paragraph(
                f"Generated on {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}",
                self.styles["Normal"]
            )
        )
        story.append(PageBreak())

        # Table of contents
        story.append(Paragraph("Table of Contents", self.styles["CustomHeading"]))
        story.append(Spacer(1, 12))
        toc_items = []
        if occupancy_data:
            toc_items.append("1. Occupancy Analysis")
        if revenue_data:
            toc_items.append("2. Revenue Analysis")
        if customer_data:
            toc_items.append("3. Customer Analysis")

        for item in toc_items:
            story.append(Paragraph(item, self.styles["Normal"]))
            story.append(Spacer(1, 6))

        story.append(PageBreak())

        # Occupancy section
        if occupancy_data:
            story.append(Paragraph("1. Occupancy Analysis", self.styles["CustomHeading"]))
            story.append(Spacer(1, 12))

            # Add chart if available
            if charts and "occupancy" in charts:
                img_buffer = io.BytesIO(charts["occupancy"])
                img = Image(img_buffer, width=6 * inch, height=3.6 * inch)
                story.append(img)
                story.append(Spacer(1, 12))

            # Add summary table
            total_bookings = sum(d.get("total_bookings", 0) for d in occupancy_data)
            avg_occupancy = sum(d.get("occupancy_rate", 0) for d in occupancy_data) / len(occupancy_data)

            summary_data = [
                ["Metric", "Value"],
                ["Average Occupancy", f"{avg_occupancy:.2f}%"],
                ["Total Bookings", str(total_bookings)],
            ]

            summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
            summary_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ])
            )
            story.append(summary_table)
            story.append(PageBreak())

        # Revenue section
        if revenue_data:
            story.append(Paragraph("2. Revenue Analysis", self.styles["CustomHeading"]))
            story.append(Spacer(1, 12))

            # Add chart if available
            if charts and "revenue" in charts:
                img_buffer = io.BytesIO(charts["revenue"])
                img = Image(img_buffer, width=6 * inch, height=3.6 * inch)
                story.append(img)
                story.append(Spacer(1, 12))

            # Add summary
            total_revenue = sum(d.get("total_revenue", 0) for d in revenue_data)
            story.append(
                Paragraph(
                    f"Total Revenue: ${total_revenue:,.2f}",
                    self.styles["CustomSubHeading"]
                )
            )
            story.append(PageBreak())

        # Customer section
        if customer_data:
            story.append(Paragraph("3. Customer Analysis", self.styles["CustomHeading"]))
            story.append(Spacer(1, 12))

            # Top customers table
            table_data = [["Customer", "Revenue", "Bookings"]]
            for row in customer_data[:10]:
                table_data.append([
                    row.get("full_name", ""),
                    f"${row.get('total_revenue', 0):,.2f}",
                    str(row.get("booking_count", 0)),
                ])

            customer_table = Table(table_data, colWidths=[3 * inch, 2 * inch, 1.5 * inch])
            customer_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ])
            )
            story.append(customer_table)

        # Build PDF
        doc.build(story, onFirstPage=self._create_header_footer, onLaterPages=self._create_header_footer)

        buffer.seek(0)
        return buffer.read()
