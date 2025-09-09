import csv
import io
import re
from datetime import datetime
from typing import Any

from sqlmodel import Session

from app.crud.customer import customer as crud_customer
from app.models import CustomerCreate


class ImportService:
    def __init__(self, session: Session):
        self.session = session

    def _validate_phone(self, phone: str | None) -> str | None:
        """Validate phone number format."""
        if not phone:
            return None
        # Remove all non-digit characters for validation
        digits_only = re.sub(r'\D', '', phone)
        if len(digits_only) < 7 or len(digits_only) > 15:
            raise ValueError(f"Invalid phone number: {phone}")
        return phone.strip()

    def _validate_date_of_birth(self, date_str: str | None) -> datetime | None:
        """Parse and validate date of birth."""
        if not date_str:
            return None

        # Try common date formats
        date_formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%d.%m.%Y",
            "%Y/%m/%d",
        ]

        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        raise ValueError(f"Invalid date format: {date_str}")

    def import_customers_from_csv(
        self, csv_content: bytes
    ) -> dict[str, Any]:
        """Import customers from CSV file.

        Returns a report with validation errors and import results.
        """
        try:
            # Decode CSV content
            csv_text = csv_content.decode("utf-8-sig")  # Handle BOM if present
            csv_file = io.StringIO(csv_text)
            reader = csv.DictReader(csv_file)

            # Validate required fields
            required_fields = {"first_name", "last_name", "phone"}
            if reader.fieldnames:
                missing_fields = required_fields - set(reader.fieldnames)
                if missing_fields:
                    return {
                        "success": False,
                        "error": f"Missing required fields: {', '.join(missing_fields)}",
                        "imported": 0,
                    }

            # Process rows
            rows_to_import = []
            validation_errors = []
            duplicates_in_csv: dict[str, list[dict[str, Any]]] = {}
            existing_in_db: dict[str, dict[str, Any]] = {}

            for row_num, row in enumerate(reader, start=2):  # Start from 2 (header is row 1)
                try:
                    # Validate required fields
                    if not row.get("first_name") or not row.get("last_name"):
                        validation_errors.append({
                            "row": row_num,
                            "error": "First name and last name are required",
                        })
                        continue

                    # Validate and normalize phone
                    phone = self._validate_phone(row.get("phone"))
                    if not phone:
                        validation_errors.append({
                            "row": row_num,
                            "error": "Phone number is required",
                        })
                        continue

                    # Parse date of birth
                    date_of_birth = None
                    if row.get("date_of_birth"):
                        try:
                            date_of_birth = self._validate_date_of_birth(row["date_of_birth"])
                        except ValueError as e:
                            validation_errors.append({
                                "row": row_num,
                                "error": str(e),
                            })
                            continue

                    # Create customer data
                    customer_data = {
                        "first_name": row["first_name"].strip().title(),
                        "last_name": row["last_name"].strip().title(),
                        "phone": phone,
                        "date_of_birth": date_of_birth,
                        "district": row.get("district", "").strip() or None,
                        "row_num": row_num,
                    }

                    rows_to_import.append(customer_data)

                except Exception as e:
                    validation_errors.append({
                        "row": row_num,
                        "error": str(e),
                    })

            # Check for duplicates within CSV
            phone_to_rows: dict[str, list[dict[str, Any]]] = {}
            for customer_data in rows_to_import:
                phone = customer_data["phone"]
                if phone not in phone_to_rows:
                    phone_to_rows[phone] = []
                phone_to_rows[phone].append(customer_data)

            # Find duplicates in CSV
            for phone, customers in phone_to_rows.items():
                if len(customers) > 1:
                    duplicates_in_csv[phone] = [
                        {
                            "row": c["row_num"],
                            "name": f"{c['first_name']} {c['last_name']}",
                        }
                        for c in customers
                    ]

            # Check for existing customers in database
            unique_phones = list(phone_to_rows.keys())
            if unique_phones:
                existing_customers = crud_customer.get_by_phones(
                    self.session, phones=unique_phones
                )

                for customer in existing_customers:
                    if customer.phone in phone_to_rows:
                        csv_customer = phone_to_rows[customer.phone][0]
                        existing_in_db[customer.phone] = {
                            "csv_row": csv_customer["row_num"],
                            "csv_name": f"{csv_customer['first_name']} {csv_customer['last_name']}",
                            "db_customer": {
                                "id": str(customer.id),
                                "name": f"{customer.first_name} {customer.last_name}",
                                "district": customer.district,
                            },
                        }

            # If there are any issues, return report without importing
            if validation_errors or duplicates_in_csv or existing_in_db:
                return {
                    "success": False,
                    "message": "Import cancelled due to validation errors or duplicates",
                    "imported": 0,
                    "validation_errors": validation_errors,
                    "duplicates_in_csv": duplicates_in_csv,
                    "existing_in_db": existing_in_db,
                }

            # Import customers (no duplicates or errors)
            imported_count = 0
            for customer_data in rows_to_import:
                # Remove row_num from data before creating customer
                customer_data.pop("row_num", None)

                # Use CRUD to create customer
                customer_create = CustomerCreate(**customer_data)
                crud_customer.create(self.session, obj_in=customer_create)
                imported_count += 1

            self.session.commit()

            return {
                "success": True,
                "message": f"Successfully imported {imported_count} customers",
                "imported": imported_count,
            }

        except UnicodeDecodeError:
            return {
                "success": False,
                "error": "Invalid CSV file encoding. Please use UTF-8.",
                "imported": 0,
            }
        except Exception as e:
            self.session.rollback()
            return {
                "success": False,
                "error": f"Import failed: {str(e)}",
                "imported": 0,
            }

    def validate_csv_structure(self, csv_content: bytes) -> dict[str, Any]:
        """Validate CSV structure without importing."""
        try:
            csv_text = csv_content.decode("utf-8-sig")
            csv_file = io.StringIO(csv_text)
            reader = csv.DictReader(csv_file)

            # Check if file has headers
            if not reader.fieldnames:
                return {
                    "valid": False,
                    "error": "CSV file appears to be empty or invalid",
                }

            # Check for required fields
            required_fields = {"first_name", "last_name", "phone"}
            missing_fields = required_fields - set(reader.fieldnames)

            if missing_fields:
                return {
                    "valid": False,
                    "error": f"Missing required fields: {', '.join(missing_fields)}",
                    "fields": reader.fieldnames,
                }

            # Count rows
            row_count = sum(1 for _ in reader)

            return {
                "valid": True,
                "fields": reader.fieldnames,
                "row_count": row_count,
                "required_fields": list(required_fields),
                "optional_fields": ["date_of_birth", "district"],
            }

        except UnicodeDecodeError:
            return {
                "valid": False,
                "error": "Invalid CSV file encoding. Please use UTF-8.",
            }
        except Exception as e:
            return {
                "valid": False,
                "error": f"Failed to parse CSV: {str(e)}",
            }
