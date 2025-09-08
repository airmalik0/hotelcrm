from typing import Any

from pydantic import BaseModel


class ImportValidationError(BaseModel):
    row: int
    error: str


class CSVDuplicate(BaseModel):
    phone: str
    rows: list[dict[str, Any]]


class ExistingCustomer(BaseModel):
    csv_row: int
    csv_name: str
    db_customer: dict[str, Any]


class ImportResult(BaseModel):
    success: bool
    message: str | None = None
    imported: int = 0
    validation_errors: list[ImportValidationError] | None = None
    duplicates_in_csv: dict[str, list[dict[str, Any]]] | None = None
    existing_in_db: dict[str, dict[str, Any]] | None = None
    error: str | None = None


class CSVValidationResult(BaseModel):
    valid: bool
    error: str | None = None
    fields: list[str] | None = None
    row_count: int | None = None
    required_fields: list[str] | None = None
    optional_fields: list[str] | None = None
