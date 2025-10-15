"""
Hotel business type - single business type for hotel CRM integration
"""
from .base import BusinessType
from .hotel import HotelBusinessType

# Single business type: hotel
_HOTEL_TYPE = HotelBusinessType()


def get_business_type(type_id: str = 'hotel') -> BusinessType:
    """Get hotel business type (only type available)"""
    return _HOTEL_TYPE
