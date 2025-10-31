from functools import lru_cache

import pycountry  # type: ignore
from fastapi import APIRouter, Query

router = APIRouter()


@lru_cache(maxsize=1)
def _get_countries() -> list[dict[str, str]]:
    countries: list[dict[str, str]] = []
    for c in pycountry.countries:
        # Prefer common_name if available, fallback to name
        name = getattr(c, "common_name", c.name)
        countries.append({"code": c.alpha_2, "name": name})
    # Sort by name
    countries.sort(key=lambda x: x["name"])  # type: ignore
    return countries


@router.get("/countries")
def get_countries() -> list[dict[str, str]]:
    """Return list of countries (ISO-3166 alpha-2)."""
    return _get_countries()


# Regions of Uzbekistan (области) + отдельный ключ для города Ташкента
UZ_REGIONS: list[dict[str, str]] = [
    {"code": "TASHKENT_CITY", "name": "Toshkent"},
    {"code": "TASHKENT_REGION", "name": "Toshkent region"},
    {"code": "ANDIJAN", "name": "Andijon"},
    {"code": "BUKHARA", "name": "Buxoro"},
    {"code": "FERGANA", "name": "Farg'ona"},
    {"code": "JIZZAKH", "name": "Jizzax"},
    {"code": "KARAKALPAKSTAN", "name": "Qoraqalpog'iston"},
    {"code": "KASHKADARYA", "name": "Qashqadaryo"},
    {"code": "NAMANGAN", "name": "Namangan"},
    {"code": "NAVOI", "name": "Navoiy"},
    {"code": "SAMARKAND", "name": "Samarqand"},
    {"code": "SURKHANDARYA", "name": "Surxondaryo"},
    {"code": "SYRDARYA", "name": "Sirdaryo"},
    {"code": "KHOAREZM", "name": "Xorazm"},
]


@router.get("/regions")
def get_regions(country: str = Query(..., min_length=2, max_length=2)) -> list[dict[str, str]]:
    """Return regions for a given country. For UZ we return predefined regions.

    - country: ISO-3166 alpha-2 (e.g., UZ)
    """
    country_code = country.strip().upper()
    if country_code == "UZ":
        return UZ_REGIONS
    # For other countries we currently don't provide regions
    return []


@router.get("/districts")
def get_districts(region: str = Query(..., min_length=2)) -> list[dict[str, str]]:
    """Return districts for a given region.

    Only supports region=TASHKENT_CITY to return Tashkent districts.
    """
    region_code = region.strip().upper()
    if region_code != "TASHKENT_CITY":
        return []

    # Districts of Tashkent (from enum in models.common)
    from app.models.common import District

    return [{"code": d.value, "name": d.value.replace("_", " ").title()} for d in District]



