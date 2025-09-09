import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import SessionDep, get_current_admin_user
from app.core.audit import log_audit
from app.models import User
from app.schemas.import_schemas import CSVValidationResult, ImportResult
from app.services.import_service import ImportService

router = APIRouter()


@router.post(
    "/customers/validate",
    response_model=CSVValidationResult,
    dependencies=[Depends(get_current_admin_user)]
)
async def validate_customer_csv(
    session: SessionDep,
    file: UploadFile = File(...)
) -> CSVValidationResult:
    """Validate CSV file structure without importing (admin only)."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Read file content
    content = await file.read()

    # Validate CSV structure
    import_service = ImportService(session)
    result = import_service.validate_csv_structure(content)

    return result


@router.post(
    "/customers/import",
    response_model=ImportResult,
)
async def import_customers_from_csv(
    session: SessionDep,
    current_user: User = Depends(get_current_admin_user),
    file: UploadFile = File(...)
) -> ImportResult:
    """Import customers from CSV file (admin only).

    Required CSV fields:
    - first_name: Customer first name
    - last_name: Customer last name
    - phone: Phone number (unique identifier)

    Optional fields:
    - date_of_birth: Date of birth (YYYY-MM-DD format)
    - district: District of residence

    The import will be cancelled if:
    - There are validation errors
    - There are duplicate phone numbers within the CSV
    - Customers with the same phone numbers already exist in the database
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    # Read file content
    content = await file.read()

    # Import customers
    import_service = ImportService(session)
    result = import_service.import_customers_from_csv(content)

    if not result.get("success", False):
        # Return detailed error information
        return result

    # Log audit for successful import
    log_audit(
        session=session,
        user=current_user,
        action="imported",
        entity_type="customers",
        entity_id=uuid.uuid4(),  # Generate a tracking ID for this import
        entity_name="CSV Import",
        description=f"Imported {result.get('imported', 0)} customers from CSV"
    )
    session.commit()

    return result


@router.get(
    "/customers/template"
)
async def get_customer_import_template() -> Any:
    """Get CSV template for customer import."""
    import csv
    import io

    from fastapi import Response

    # Create CSV template
    output = io.StringIO()
    writer = csv.writer(output)

    # Write headers
    headers = ["first_name", "last_name", "phone", "date_of_birth", "district"]
    writer.writerow(headers)

    # Write sample data
    sample_data = [
        ["John", "Doe", "+1234567890", "1990-01-15", "Downtown"],
        ["Jane", "Smith", "+0987654321", "1985-06-20", "Uptown"],
        ["Bob", "Johnson", "+1122334455", "1992-03-10", "Midtown"],
    ]
    writer.writerows(sample_data)

    # Create response
    content = output.getvalue()

    return Response(
        content=content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=customer_import_template.csv"
        }
    )


@router.get(
    "/customers/export",
)
async def export_all_customers(
    session: SessionDep,
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Export all customers to CSV (admin only)."""
    from fastapi import Response

    from app.crud.customer import customer as crud_customer
    from app.services.export_service import ExportService

    # Get all customers
    customers = crud_customer.get_multi(session, skip=0, limit=10000)

    # Convert to dict format
    customer_data = []
    for customer in customers:
        customer_data.append({
            "first_name": customer.first_name,
            "last_name": customer.last_name,
            "phone": customer.phone or "",
            "date_of_birth": customer.date_of_birth.strftime("%Y-%m-%d") if customer.date_of_birth else "",
            "district": customer.district or "",
            "total_spent": customer.total_spent,
            "total_bookings": customer.total_bookings,
            "created_at": customer.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })

    # Export to CSV
    export_service = ExportService()
    csv_content = await export_service.export_to_csv(customer_data)

    # Log audit for export
    log_audit(
        session=session,
        user=current_user,
        action="exported",
        entity_type="customers",
        entity_id=uuid.uuid4(),  # Generate a tracking ID for this export
        entity_name="CSV Export",
        description=f"Exported {len(customer_data)} customers to CSV"
    )
    session.commit()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=customers_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )
