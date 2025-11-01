"""Update customer created_at dates based on first appearance in clientbase.xlsx.

This script reads the clientbase.xlsx file and for each customer finds the first
sheet where their phone number appeared, then sets created_at to the first day
of that month.

Sheet names are in format 'MM.YY' (e.g., '11.20' for November 2020).
"""

from __future__ import annotations

import argparse
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sqlmodel import Session, select

from app.core.db import engine
from app.models.customer import Customer


def normalize_phone(raw: str) -> str | None:
    """Normalize phone number to match database format."""
    digits = re.sub(r"\D", "", raw or "")
    if not digits or len(digits) < 7:
        return None
    # Ensure phone starts with 998 (Uzbekistan country code)
    if len(digits) == 9:
        digits = "998" + digits
    return digits if 7 <= len(digits) <= 15 else None


def parse_sheet_name_to_date(sheet_name: str) -> datetime | None:
    """Parse sheet name like '11.20' to datetime (2020-11-01).

    Format: MM.YY where YY is 2-digit year (20 = 2020, 21 = 2021, etc.)
    Returns: First day of the month as timezone-aware datetime
    """
    match = re.match(r"^(\d{1,2})\.(\d{2})$", sheet_name.strip())
    if not match:
        return None

    month_str, year_str = match.groups()
    month = int(month_str)
    year_2digit = int(year_str)

    # Convert 2-digit year to 4-digit (20 -> 2020, 21 -> 2021, etc.)
    # Assuming years 20-99 are 2020-2099
    year = 2000 + year_2digit

    if not (1 <= month <= 12):
        return None

    return datetime(year, month, 1, tzinfo=timezone.utc)


def extract_phones_from_sheet(
    excel_path: str,
    sheet_name: str,
) -> set[str]:
    """Extract all normalized phone numbers from a single sheet."""
    try:
        df = pd.read_excel(excel_path, sheet_name=sheet_name, engine="openpyxl")

        # Find phone column (same logic as import script)
        phone_col = None
        normalized_columns = {
            re.sub(r"\s+", "", str(c)).strip().lower(): c for c in df.columns
        }
        phone_candidates = [
            "тел номер", "телефон", "тел", "номер", "телефон номер"
        ]

        for key in phone_candidates:
            nkey = re.sub(r"\s+", "", key).lower()
            for norm, original in normalized_columns.items():
                if nkey == norm:
                    phone_col = original
                    break
            if phone_col:
                break

        if not phone_col:
            return set()

        # Extract and normalize phones
        phones = set()
        for phone_raw in df[phone_col].dropna():
            phone_norm = normalize_phone(str(phone_raw))
            if phone_norm:
                phones.add(phone_norm)

        return phones

    except Exception as e:
        print(f"⚠️  Error reading sheet '{sheet_name}': {e}")
        return set()


def build_phone_to_first_date_map(excel_path: str) -> dict[str, datetime]:
    """Build mapping of phone number to first appearance date.

    Returns:
        Dict mapping phone number to datetime of first appearance
    """
    xf = pd.ExcelFile(excel_path, engine="openpyxl")

    # Filter out non-date sheets (like 'Итог', 'Summary', etc.)
    date_sheets = []
    for sheet_name in xf.sheet_names:
        sheet_date = parse_sheet_name_to_date(sheet_name)
        if sheet_date:
            date_sheets.append((sheet_name, sheet_date))

    # Sort by date (earliest first)
    date_sheets.sort(key=lambda x: x[1])

    print(f"📅 Found {len(date_sheets)} date sheets (sorted by date):")
    for sheet_name, sheet_date in date_sheets[:5]:
        print(f"   - {sheet_name} → {sheet_date.strftime('%Y-%m-%d')}")
    if len(date_sheets) > 5:
        print(f"   ... and {len(date_sheets) - 5} more")

    # Build mapping: phone -> first appearance date
    phone_first_date: dict[str, datetime] = {}

    for idx, (sheet_name, sheet_date) in enumerate(date_sheets, start=1):
        phones_in_sheet = extract_phones_from_sheet(excel_path, sheet_name)

        new_phones = 0
        for phone in phones_in_sheet:
            if phone not in phone_first_date:
                phone_first_date[phone] = sheet_date
                new_phones += 1

        print(
            f"   [{idx}/{len(date_sheets)}] {sheet_name}: "
            f"{len(phones_in_sheet)} phones, {new_phones} new"
        )

    print(f"\n✅ Total unique phones across all sheets: {len(phone_first_date)}")
    return phone_first_date


def update_customer_dates(
    phone_first_date: dict[str, datetime],
    *,
    dry_run: bool = False,
) -> dict[str, int]:
    """Update customer created_at dates based on first appearance.

    Returns:
        Stats dict with counts
    """
    with Session(engine) as session:
        # Get all customers
        stmt = select(Customer)
        customers = session.exec(stmt).all()

        print(f"\n🔍 Found {len(customers)} customers in database")

        updated = 0
        not_found = 0
        no_change = 0

        for customer in customers:
            if not customer.phone:
                not_found += 1
                continue

            first_date = phone_first_date.get(customer.phone)
            if not first_date:
                not_found += 1
                if dry_run:
                    print(
                        f"   ⚠️  Phone {customer.phone} ({customer.first_name}) "
                        f"not found in Excel sheets"
                    )
                continue

            # Check if date needs updating
            if customer.created_at == first_date:
                no_change += 1
                continue

            if dry_run:
                print(
                    f"   📋 {customer.phone} ({customer.first_name}): "
                    f"{customer.created_at.strftime('%Y-%m-%d') if customer.created_at else 'None'} "
                    f"→ {first_date.strftime('%Y-%m-%d')}"
                )
            else:
                customer.created_at = first_date
                session.add(customer)

            updated += 1

        if not dry_run and updated > 0:
            session.commit()
            print(f"\n💾 Committed {updated} updates to database")

        return {
            "updated": updated,
            "not_found": not_found,
            "no_change": no_change,
            "total": len(customers),
        }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Update customer created_at dates based on first appearance in clientbase.xlsx"
    )
    parser.add_argument(
        "--file",
        default="app/scripts/clientbase.xlsx",
        help="Path to Excel file (default: app/scripts/clientbase.xlsx)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without updating database",
    )
    args = parser.parse_args()

    excel_path = args.file
    if not Path(excel_path).exists():
        print(f"❌ Error: File not found: {excel_path}")
        return

    print(f"{'='*80}")
    print(f"📄 Reading Excel file: {excel_path}")
    print(f"{'='*80}\n")

    # Step 1: Build phone -> first date mapping
    phone_first_date = build_phone_to_first_date_map(excel_path)

    # Step 2: Update database
    print(f"\n{'='*80}")
    if args.dry_run:
        print("🔍 DRY RUN: Previewing changes (no database updates)")
    else:
        print("🚀 Updating database...")
    print(f"{'='*80}")

    stats = update_customer_dates(phone_first_date, dry_run=args.dry_run)

    # Print summary
    print(f"\n{'='*80}")
    print("📊 SUMMARY")
    print(f"{'='*80}")
    print(f"   Total customers: {stats['total']}")
    print(f"   ✅ Updated: {stats['updated']}")
    print(f"   ⚠️  Not found in Excel: {stats['not_found']}")
    print(f"   ➖ No change needed: {stats['no_change']}")
    print(f"{'='*80}")

    if args.dry_run and stats['updated'] > 0:
        print("\n💡 Run without --dry-run to apply changes to database")


if __name__ == "__main__":
    main()
