from __future__ import annotations

import argparse
import os
import re
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal, TypedDict

import pandas as pd
from openai import OpenAI
from sqlmodel import Session, select

from app.api.routes.geo import UZ_REGIONS
from app.core.db import engine
from app.models import Customer, CustomerCreate
from app.models.common import District
from app.services.customer import CustomerService

# -----------------------------
# Data structures
# -----------------------------


class GeoOut(TypedDict, total=False):
    country_code: Literal["UZ"] | None
    region: str | None
    district: str | None


class LLMGeoOutput(TypedDict):
    geo: GeoOut


class TokenUsage(TypedDict):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass
class RawRow:
    name: str
    phone: str
    birth_raw: str | None
    region_text: str | None
    district_text: str | None


# -----------------------------
# Utilities
# -----------------------------


def normalize_phone(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw or "")
    if not digits or len(digits) < 7:
        return None
    # Ensure phone starts with 998 (Uzbekistan country code)
    if not digits.startswith("998"):
        # If it's a 9-digit local number, prepend 998
        if len(digits) == 9:
            digits = "998" + digits
    return digits if 7 <= len(digits) <= 15 else None


def parse_birth_date(birth_raw: str | None) -> datetime | None:
    if not birth_raw:
        return None
    text = str(birth_raw).strip()
    if text.lower() in {"nan", "none", "null", ""}:
        return None
    # Try year only
    if re.fullmatch(r"\d{4}", text):
        return datetime(int(text), 1, 1)
    # Try common date formats
    for fmt in ("%d.%m.%Y", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass
    # Fallback via pandas
    try:
        ts = pd.to_datetime(text, errors="raise", dayfirst=True)
        if pd.isna(ts):
            return None
        # mypy: pandas returns Timestamp with tz info possibly None
        return ts.to_pydatetime()  # type: ignore[return-value]
    except Exception:
        return None


def find_column(df: pd.DataFrame, candidates: Iterable[str]) -> str | None:
    normalized_columns = {re.sub(r"\s+", "", str(c)).strip().lower(): c for c in df.columns}
    for key in candidates:
        nkey = re.sub(r"\s+", "", key).lower()
        for norm, original in normalized_columns.items():
            if nkey == norm:
                return original
    return None


def _clean_text(val: Any) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    if s.lower() in {"nan", "none", "null"}:
        return None
    if re.fullmatch(r"[#_\-\s]+", s):
        return None
    return s


# -----------------------------
# Name normalization (deterministic, no LLM)
# -----------------------------

_APOSTROPHES = ["'", "’", "ʼ", "`", "´", "ʹ", "ʽ", "ˈ", "ʻ"]


def _normalize_apostrophes(text: str) -> str:
    s = text
    for ch in _APOSTROPHES:
        s = s.replace(ch, "ʻ")  # U+02BB
    return s


def _is_cyrillic(text: str) -> bool:
    return any("\u0400" <= ch <= "\u04FF" for ch in text)


def _is_latin(text: str) -> bool:
    return any("A" <= ch <= "Z" or "a" <= ch <= "z" for ch in text)


def _word_case_flags(word: str) -> tuple[bool, bool]:
    is_all_upper = word.isupper()
    is_title = word[:1].isupper() and word[1:].lower() == word[1:]
    return is_all_upper, is_title


def _apply_case(sample: str, mapped: str) -> str:
    is_all_upper, is_title = _word_case_flags(sample)
    if is_all_upper:
        return mapped.upper()
    if is_title:
        return mapped[:1].upper() + mapped[1:].lower()
    return mapped


def _translit_lat_to_cyr_word(word: str) -> str:
    w = _normalize_apostrophes(word)
    i = 0
    out: list[str] = []
    while i < len(w):
        # two/three-letter sequences (order matters)
        chunk2 = w[i : i + 2]
        chunk2_low = chunk2.lower()
        chunk3 = w[i : i + 3]
        chunk3_low = chunk3.lower()

        # ё/ю/я at beginning as yo/yu/ya (handled in cyr->lat), here just map digraphs
        if chunk2_low == "sh":
            out.append("ш")
            i += 2
            continue
        if chunk2_low == "ch":
            out.append("ч")
            i += 2
            continue
        if chunk2_low == "ng":
            out.append("нг")
            i += 2
            continue
        if chunk2_low in {"oʻ", "o'"}:
            out.append("ў")
            i += 2
            continue
        if chunk2_low in {"gʻ", "g'"}:
            out.append("ғ")
            i += 2
            continue
        if chunk2_low == "yo":
            out.append("ё")
            i += 2
            continue
        if chunk2_low == "yu":
            out.append("ю")
            i += 2
            continue
        if chunk2_low == "ya":
            out.append("я")
            i += 2
            continue
        if chunk2_low == "ye":
            out.append("е")
            i += 2
            continue

        ch = w[i]
        low = ch.lower()
        mapped = {
            "a": "а",
            "b": "б",
            "c": "с",  # fallback
            "d": "д",
            "e": "е",
            "f": "ф",
            "g": "г",
            "h": "ҳ",
            "i": "и",
            "j": "ж",
            "k": "к",
            "l": "л",
            "m": "м",
            "n": "н",
            "o": "о",
            "p": "п",
            "q": "қ",
            "r": "р",
            "s": "с",
            "t": "т",
            "u": "у",
            "v": "в",
            "w": "в",
            "x": "х",
            "y": "й",
            "z": "з",
            "ʻ": "ʼ",  # ignore apostrophe in Cyrillic; map to modifier for safety
        }.get(low, ch)
        # preserve case of single letters via _apply_case on one-letter sample
        out.append(_apply_case(ch, mapped))
        i += 1
    return "".join(out)


def _translit_cyr_to_lat_word(word: str) -> str:
    w = word
    out: list[str] = []
    for idx, ch in enumerate(w):
        low = ch.lower()
        mapped = {
            "а": "a",
            "б": "b",
            "в": "v",
            "г": "g",
            "ғ": "gʻ",
            "д": "d",
            "е": "e" if idx > 0 else "ye",
            "ё": "yo",
            "ж": "j",
            "з": "z",
            "и": "i",
            "й": "y",
            "к": "k",
            "қ": "q",
            "л": "l",
            "м": "m",
            "н": "n",
            "о": "o",
            "п": "p",
            "р": "r",
            "с": "s",
            "т": "t",
            "у": "u",
            "ў": "oʻ",
            "ф": "f",
            "х": "x",
            "ҳ": "h",
            "ц": "ts",
            "ч": "ch",
            "ш": "sh",
            "щ": "shch",
            "ъ": "",
            "ь": "",
            "ю": "yu",
            "я": "ya",
            "ы": "i",
            "э": "e",
        }.get(low, ch)
        out.append(_apply_case(ch, mapped))
    return "".join(out)


def _extract_first_token(name: str) -> str:
    if not name:
        return ""
    # Split by whitespace or commas/semicolons, keep hyphens inside tokens
    parts = re.split(r"[\s,;]+", name.strip())
    return parts[0] if parts else ""


def normalize_name_dual(raw_name: str) -> tuple[str, str | None]:
    token = _extract_first_token(raw_name)
    if not token:
        return "_", None
    token = _normalize_apostrophes(token)

    has_cyr = _is_cyrillic(token)
    has_lat = _is_latin(token)

    # Prefer the dominant script; if mixed, prioritize Cyrillic
    if has_cyr and not has_lat:
        cyr = token
        lat = _translit_cyr_to_lat_word(token)
    elif has_lat and not has_cyr:
        lat = token
        cyr = _translit_lat_to_cyr_word(token)
    else:
        # Mixed or unknown: default to Cyrillic path
        cyr = token
        lat = _translit_cyr_to_lat_word(token)

    # Normalize to title-case for stability (passport-style)
    lat_norm = lat[:1].upper() + lat[1:].lower() if lat else lat
    cyr_norm = cyr[:1].upper() + cyr[1:].lower() if cyr else cyr
    return lat_norm, cyr_norm


def extract_rows_from_excel(path: str, *, sheet: str | int | None = None) -> list[RawRow]:
    if sheet == "last":
        xf = pd.ExcelFile(path, engine="openpyxl")
        sheet_name = xf.sheet_names[-1]
        df = xf.parse(sheet_name)
    elif sheet == "second_last":
        xf = pd.ExcelFile(path, engine="openpyxl")
        sheet_name = xf.sheet_names[-2]
        df = xf.parse(sheet_name)
    elif isinstance(sheet, int) and sheet < 0:
        xf = pd.ExcelFile(path, engine="openpyxl")
        idx = len(xf.sheet_names) + sheet  # sheet is negative
        if idx < 0 or idx >= len(xf.sheet_names):
            raise ValueError("Sheet index out of range")
        df = xf.parse(xf.sheet_names[idx])
    elif sheet is not None:
        df = pd.read_excel(path, engine="openpyxl", sheet_name=sheet)
    else:
        df = pd.read_excel(path, engine="openpyxl")

    name_col = find_column(df, ["Имя", "ФИО", "фио", "имя"])
    phone_col = find_column(df, ["Тел номер", "Телефон", "телефон", "тел номер", "телефон номер", "тел", "номер"])
    birth_col = find_column(df, ["Год Рождения", "Год рож", "Дата рождения", "год рождения", "дата рождения"])
    region_col = find_column(df, ["район м", "районм", "место жительство", "место жительства"])  # customer location

    if not name_col or not phone_col:
        raise RuntimeError("Не удалось найти обязательные колонки: Имя и Тел номер")

    # Normalize phones and keep last occurrence
    df["_phone_norm"] = df[phone_col].astype(str).map(normalize_phone)
    df = df.dropna(subset=["_phone_norm"])  # remove rows without valid phone
    df = df.drop_duplicates(subset=["_phone_norm"], keep="last")

    rows: list[RawRow] = []
    for _, r in df.iterrows():
        rows.append(
            RawRow(
                name=str(r.get(name_col, "")).strip(),
                phone=str(r.get("_phone_norm")),
                birth_raw=_clean_text(r.get(birth_col)) if birth_col else None,
                region_text=_clean_text(r.get(region_col)) if region_col else None,
                district_text=None,  # Not extracted from Excel yet
            )
        )
    return rows


# -----------------------------
# OpenAI normalization (Geo only)
# -----------------------------


def build_geo_enums() -> tuple[list[str], list[str]]:
    region_codes = [r["code"] for r in UZ_REGIONS]
    district_codes = [d.value for d in District]
    return region_codes, district_codes


def normalize_geo_via_llm(client: OpenAI, item: RawRow, region_codes: list[str], district_codes: list[str]) -> tuple[GeoOut, TokenUsage | None]:
    # Compose prompt for GEO ONLY
    has_location = bool(item.region_text and item.region_text.strip())
    user_text = (
        f"Normalize the following customer location. Return ONLY structured JSON.\n"
    )
    if has_location:
        user_text += f"location: {item.region_text}\n\n"
    else:
        user_text += "location: (none)\n\n"

    user_text += (
        f"Allowed region codes: {', '.join(region_codes)}\n"
        f"Allowed district codes: {', '.join(district_codes)}\n"
        "Rules for location:\n"
        "1. Determine if location is in Uzbekistan (UZ). If yes, set country_code='UZ'.\n"
        "2. If country_code='UZ', match location to one of the allowed region codes.\n"
        "   - 'Uzbekistan' only → country_code='UZ', region=null, district=null\n"
        "   - 'Tashkent city' → region='TASHKENT_CITY', try to identify district\n"
        "   - 'Tashkent' standalone → region='TASHKENT_CITY', district=null\n"
        "   - A Tashkent district name → region='TASHKENT_CITY' and a matching district code\n"
        "   - Other Uzbek regions/cities → match to appropriate region code\n"
        "3. If region='TASHKENT_CITY' and a district is specified, match to allowed district codes.\n"
        "4. If location is outside Uzbekistan: set country_code=null, region=null, district=null\n"
        "District codes are ONLY for Tashkent city.\n"
    )

    geo_properties = {
        "country_code": {"enum": ["UZ", None]},
        "region": {"enum": region_codes + [None]},
        "district": {"enum": district_codes + [None]},
    } if has_location else {
        "country_code": {"type": "null"},
        "region": {"type": "null"},
        "district": {"type": "null"},
    }

    schema: dict[str, Any] = {
        "name": "GeoNormalization",
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": geo_properties,
            "required": ["country_code", "region", "district"],
        },
        "strict": True,
    }

    response_format = {"type": "json_schema", "json_schema": schema}
    content: str | None = None
    usage: TokenUsage | None = None

    try:
        resp = client.responses.create(  # type: ignore[call-overload]
            model="gpt-5-nano",
            input=user_text,
            response_format=response_format,  # type: ignore[arg-type]
            reasoning_effort="minimal",
        )
        if hasattr(resp, "output_text"):
            content = getattr(resp, "output_text")  # type: ignore[assignment]
        elif getattr(resp, "output", None):
            content = resp.output[0].content[0].text  # type: ignore[assignment, attr-defined]

        # Extract usage if available
        if hasattr(resp, "usage"):
            usage_obj = getattr(resp, "usage")
            usage = TokenUsage(
                prompt_tokens=getattr(usage_obj, "input_tokens", 0),
                completion_tokens=getattr(usage_obj, "output_tokens", 0),
                total_tokens=getattr(usage_obj, "total_tokens", 0),
            )
    except TypeError:
        # Fallback to Chat Completions API with structured output
        chat = client.chat.completions.create(  # type: ignore[call-arg]
            model="gpt-5-nano",
            messages=[{"role": "user", "content": user_text}],
            response_format=response_format,  # type: ignore[arg-type]
            reasoning_effort="minimal",
        )
        if getattr(chat, "choices", None):
            content = chat.choices[0].message.content  # type: ignore[assignment]

        # Extract usage from chat response
        if hasattr(chat, "usage") and chat.usage:
            usage = TokenUsage(
                prompt_tokens=chat.usage.prompt_tokens,
                completion_tokens=chat.usage.completion_tokens,
                total_tokens=chat.usage.total_tokens,
            )

    if not content:
        content = "{}"
    try:
        data = pd.io.json.loads(content)  # pandas' fast json loader
    except Exception:
        import json
        data = json.loads(content)
    # Coerce to GeoOut type
    geo: GeoOut = {
        "country_code": data.get("country_code"),
        "region": data.get("region"),
        "district": data.get("district"),
    }
    return geo, usage  # type: ignore[return-value]


# -----------------------------
# Main import logic
# -----------------------------


def get_existing_phones(session: Session, phones: list[str]) -> set[str]:
    """Query DB for existing customer phones in a single batch."""
    if not phones:
        return set()
    stmt = select(Customer.phone).where(Customer.phone.in_(phones))
    results = session.exec(stmt).all()
    return set(results)


def process_and_import_rows(
    rows: list[RawRow],
    *,
    commit_batch: int = 10,
    dry_run: bool = False,
    verbose: bool = False,
) -> dict[str, int]:
    """Process and import a list of RawRow objects. Returns stats."""
    # Configure LangSmith tracing
    langsmith_tracing = os.getenv("LANGSMITH_TRACING", "false").lower() == "true"
    if langsmith_tracing:
        os.environ["LANGSMITH_TRACING"] = "true"
        print(f"🔍 LangSmith tracing enabled: {os.getenv('LANGSMITH_PROJECT', 'default')}")

    api_key = os.getenv("OPENAI_API_KEY", "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")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set in environment")

    client = OpenAI(api_key=api_key)

    # Check which phones already exist in DB
    with Session(engine) as session:
        all_phones = [row.phone for row in rows]
        existing_phones = get_existing_phones(session, all_phones)
        print(f"🔍 Found {len(existing_phones)} existing customers in DB")

        # Filter out existing phones
        rows_to_process = [row for row in rows if row.phone not in existing_phones]
        print(f"✨ {len(rows_to_process)} new customers to import")

        if len(rows_to_process) == 0:
            print("✅ Nothing to import. All customers already exist.")
            return {
                "created": 0,
                "skipped": 0,
                "llm_errors": 0,
                "already_existed": len(existing_phones),
                "total_tokens": 0,
            }

        # Normalize with LLM and create in DB (combined)
        region_codes, district_codes = build_geo_enums()
        service = CustomerService(session)

        created = 0
        skipped = 0
        total_tokens = 0
        llm_errors = 0

        print(f"\n🤖 Starting normalization and DB import for {len(rows_to_process)} customers...")
        import time
        start_time = time.time()

        for idx, raw in enumerate(rows_to_process, start=1):
            # Step 1a: Deterministic name normalization (no LLM)
            first_name_lat, name_cyr = normalize_name_dual(raw.name)

            # Step 1b: Geo normalization via LLM (only if location present)
            has_location = bool(raw.region_text and str(raw.region_text).strip())
            tokens_info = ""
            location_str = ""
            geo: GeoOut = {"country_code": None, "region": None, "district": None}
            if has_location:
                try:
                    item_start = time.time()
                    geo, usage = normalize_geo_via_llm(client, raw, region_codes, district_codes)
                    item_duration = time.time() - item_start

                    # Track tokens
                    if usage:
                        total_tokens += usage["total_tokens"]
                        tokens_info = f"[{usage['total_tokens']} tok, {item_duration:.1f}s]"
                    else:
                        tokens_info = f"[{item_duration:.1f}s]"

                    # Extract location info (before -> after)
                    location_parts = []
                    if geo.get("region"):
                        location_parts.append(geo["region"])
                    if geo.get("district"):
                        location_parts.append(geo["district"])
                    location_after = " → ".join(location_parts) if location_parts else "no location"

                    # Format: <было в таблице> -> <стало>
                    location_before = raw.region_text or "no location"
                    location_str = f"{location_before} -> {location_after}"

                except Exception as e:
                    llm_errors += 1
                    skipped += 1
                    print(f"  [{idx}/{len(rows_to_process)}] ✗ LLM error for {raw.name}: {type(e).__name__}: {e}")
                    if verbose:
                        import traceback
                        print(traceback.format_exc())
                    continue
            else:
                # No location provided: don't call LLM at all
                tokens_info = "[no-llm]"
                location_before = raw.region_text or "no location"
                location_str = f"{location_before} -> no location"

            # Step 2: Create in DB immediately
            try:
                date_of_birth = parse_birth_date(raw.birth_raw)

                # If no location data in source, ignore LLM geo output
                if raw.region_text:
                    district_value = geo.get("district")
                    district_enum = District(district_value) if district_value else None
                    country_code = geo.get("country_code") or None
                    region = geo.get("region") or None
                else:
                    # No location data in Excel - don't use LLM's geo output
                    district_enum = None
                    country_code = None
                    region = None

                customer_in = CustomerCreate(
                    first_name=first_name_lat,
                    last_name="_",
                    phone=raw.phone,
                    name_cyrillic=name_cyr,
                    date_of_birth=date_of_birth,
                    country_code=country_code,
                    region=region,
                    district=district_enum,
                )

                if dry_run:
                    print(
                        f"  [{idx}/{len(rows_to_process)}] 📋 DRY-RUN: {raw.name} -> {first_name_lat} "
                        f"({name_cyr or 'N/A'}) | {raw.phone} | {location_str} {tokens_info}"
                    )
                    created += 1
                else:
                    service.create_customer(customer_in)
                    created += 1
                    print(
                        f"  [{idx}/{len(rows_to_process)}] ✓ {raw.name} -> {first_name_lat} "
                        f"({name_cyr or 'N/A'}) | {raw.phone} | {location_str} {tokens_info}"
                    )

                    # Commit in batches
                    if created % commit_batch == 0:
                        session.commit()
                        print(f"  💾 Committed batch at {created} customers")

            except Exception as e:
                skipped += 1
                session.rollback()  # Rollback after DB error to continue with next record
                print(f"  [{idx}/{len(rows_to_process)}] ✗ DB error for {raw.name}: {type(e).__name__}: {e}")
                if verbose:
                    import traceback
                    print(traceback.format_exc())

        # Final commit
        if not dry_run and created > 0:
            session.commit()
            print(f"\n💾 Final commit")

        elapsed = time.time() - start_time
        avg_time = elapsed / len(rows_to_process) if rows_to_process else 0
        print(f"\n✅ Import finished in {elapsed:.1f}s (avg {avg_time:.2f}s/item)")
        print(f"📊 Created: {created} | Skipped: {skipped} (LLM errors: {llm_errors}) | Already existed: {len(existing_phones)}")
        print(f"🎯 Total tokens used: {total_tokens:,}")

        return {
            "created": created,
            "skipped": skipped,
            "llm_errors": llm_errors,
            "already_existed": len(existing_phones),
            "total_tokens": total_tokens,
        }


def import_customers(
    path: str,
    commit_batch: int = 10,
    *,
    limit: int | None = None,
    dry_run: bool = False,
    verbose: bool = False,
    sheet: str | int | None = None,
) -> None:
    # Step 1: Extract all rows from Excel (duplicates already removed)
    print(f"📄 Reading Excel file: {path} (sheet: {sheet})")
    all_rows = extract_rows_from_excel(path, sheet=sheet)
    print(f"📊 Found {len(all_rows)} unique rows (duplicates removed within sheet)")

    if limit is not None:
        all_rows = all_rows[: max(0, int(limit))]
        print(f"⚠️  Limited to {len(all_rows)} rows")

    # Step 2: Process and import
    process_and_import_rows(
        all_rows,
        commit_batch=commit_batch,
        dry_run=dry_run,
        verbose=verbose,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import customers from Excel with LLM normalization")
    parser.add_argument("--file", required=True, help="Path to Excel file (.xlsx)")
    parser.add_argument("--batch", type=int, default=100, help="Commit batch size")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of rows to process")
    parser.add_argument("--dry-run", action="store_true", help="Do not write to DB, just print normalized output")
    parser.add_argument("--verbose", action="store_true", help="Print errors for skipped rows")
    parser.add_argument("--sheet", default=None, help="Sheet name or index; use 'last' or 'second_last'")
    parser.add_argument("--all-sheets-except-last", action="store_true", help="Process all sheets except the last one")
    args = parser.parse_args()

    # Handle --all-sheets-except-last option with GLOBAL deduplication
    if args.all_sheets_except_last:
        xf = pd.ExcelFile(args.file, engine="openpyxl")
        sheets_to_process = xf.sheet_names[:-1]  # All except last

        print(f"📚 Processing {len(sheets_to_process)} sheets with GLOBAL deduplication (excluding '{xf.sheet_names[-1]}')")
        print(f"   Sheets: {', '.join(sheets_to_process)}\n")

        # Step 1: Collect all rows from all sheets
        all_rows_from_all_sheets: list[RawRow] = []
        sheet_stats: dict[str, int] = {}

        for idx, sheet_name in enumerate(sheets_to_process, start=1):
            print(f"📄 [{idx}/{len(sheets_to_process)}] Reading sheet: {sheet_name}")
            try:
                rows = extract_rows_from_excel(args.file, sheet=sheet_name)
                sheet_stats[sheet_name] = len(rows)
                all_rows_from_all_sheets.extend(rows)
                print(f"   ✓ Extracted {len(rows)} rows from '{sheet_name}'")
            except Exception as e:
                print(f"   ❌ Error reading sheet '{sheet_name}': {type(e).__name__}: {e}")
                if args.verbose:
                    import traceback
                    print(traceback.format_exc())
                continue

        print(f"\n📊 Total rows collected from all sheets: {len(all_rows_from_all_sheets)}")

        # Step 2: Global deduplication by phone (keep last occurrence)
        # Convert to DataFrame for efficient deduplication
        if all_rows_from_all_sheets:
            rows_data = [
                {
                    "phone": row.phone,
                    "name": row.name,
                    "birth_raw": row.birth_raw,
                    "region_text": row.region_text,
                    "district_text": row.district_text,
                }
                for row in all_rows_from_all_sheets
            ]
            df_all = pd.DataFrame(rows_data)

            # Remove duplicates by phone, keeping last occurrence (later sheets have priority)
            df_unique = df_all.drop_duplicates(subset=["phone"], keep="last")
            duplicates_removed = len(df_all) - len(df_unique)

            print(f"🔍 Global deduplication: {duplicates_removed} duplicates removed (keeping last occurrence)")
            print(f"✨ Unique customers after deduplication: {len(df_unique)}")

            # Convert back to RawRow objects
            unique_rows = [
                RawRow(
                    name=str(row["name"]),
                    phone=str(row["phone"]),
                    birth_raw=row["birth_raw"],
                    region_text=row["region_text"],
                    district_text=row["district_text"],
                )
                for _, row in df_unique.iterrows()
            ]

            # Apply limit if specified
            if args.limit is not None:
                unique_rows = unique_rows[: max(0, int(args.limit))]
                print(f"⚠️  Limited to {len(unique_rows)} rows")

            # Step 3: Process and import all unique rows in a single batch
            print(f"\n{'='*80}")
            print(f"🚀 Starting import of {len(unique_rows)} unique customers")
            print(f"{'='*80}\n")

            try:
                stats = process_and_import_rows(
                    unique_rows,
                    commit_batch=args.batch,
                    dry_run=args.dry_run,
                    verbose=args.verbose,
                )

                print(f"\n{'='*80}")
                print(f"✅ GLOBAL IMPORT COMPLETE")
                print(f"{'='*80}")
                print(f"📋 Sheet breakdown:")
                for sheet_name, count in sheet_stats.items():
                    print(f"   - {sheet_name}: {count} rows")
                print(f"\n📊 Final statistics:")
                print(f"   - Total rows from all sheets: {len(all_rows_from_all_sheets)}")
                print(f"   - Duplicates removed: {duplicates_removed}")
                print(f"   - Unique customers: {len(unique_rows)}")
                print(f"   - Created: {stats['created']}")
                print(f"   - Skipped: {stats['skipped']} (LLM errors: {stats['llm_errors']})")
                print(f"   - Already existed in DB: {stats['already_existed']}")
                print(f"   - Total tokens: {stats['total_tokens']:,}")
                print(f"{'='*80}")
            except Exception as e:
                print(f"\n❌ Error during import: {type(e).__name__}: {e}")
                if args.verbose:
                    import traceback
                    print(traceback.format_exc())
        else:
            print("⚠️  No rows collected from any sheet")

        return

    # Parse sheet argument: allow integers (including negative), 'last', 'second_last', or name
    sheet_arg: str | int | None
    if args.sheet is None:
        sheet_arg = None
    else:
        s = str(args.sheet).strip()
        if re.fullmatch(r"-?\d+", s):
            sheet_arg = int(s)
        elif s in {"last", "second_last"}:
            sheet_arg = s
        else:
            sheet_arg = s

    import_customers(
        args.file,
        commit_batch=args.batch,
        limit=args.limit,
        dry_run=args.dry_run,
        verbose=args.verbose,
        sheet=sheet_arg,
    )


if __name__ == "__main__":  # pragma: no cover - script entry point
    main()


