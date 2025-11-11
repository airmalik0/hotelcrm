"""
Localization system for backend reports and services.
"""
from typing import Any

from .en import REPORTS_TRANSLATIONS as EN_TRANSLATIONS
from .ru import REPORTS_TRANSLATIONS as RU_TRANSLATIONS
from .uz import REPORTS_TRANSLATIONS as UZ_TRANSLATIONS
from .zh import REPORTS_TRANSLATIONS as ZH_TRANSLATIONS

__all__ = ['get_report_text', 'get_currency_symbol', 'SUPPORTED_REPORT_LANGUAGES']

SUPPORTED_REPORT_LANGUAGES = {
    'en': 'English',
    'ru': 'Русский',
    'uz': "O'zbek",
    'zh': '中文'
}

_REPORT_TRANSLATIONS = {
    'en': EN_TRANSLATIONS,
    'ru': RU_TRANSLATIONS,
    'uz': UZ_TRANSLATIONS,
    'zh': ZH_TRANSLATIONS
}


def get_report_text(key: str, language: str = 'en') -> str:
    """
    Get translated text for reports by key and language.

    Args:
        key: Translation key
        language: Language code (en, ru, uz, zh)

    Returns:
        Translated text or key if translation not found
    """
    if language not in _REPORT_TRANSLATIONS:
        language = 'en'  # Fallback to English

    translations = _REPORT_TRANSLATIONS[language]

    # Support nested keys with dots
    keys = key.split('.')
    current_value: Any = translations

    try:
        for k in keys:
            if isinstance(current_value, dict) and k in current_value:
                current_value = current_value[k]
            else:
                # Fallback to English if translation not found
                if language != 'en':
                    return get_report_text(key, 'en')
                return key
        return str(current_value)  # Ensure we return a string
    except (KeyError, TypeError):
        # Fallback to English if translation not found
        if language != 'en':
            return get_report_text(key, 'en')
        return key


def get_currency_symbol(currency: str = 'UZS') -> str:
    """
    Get currency symbol for the given currency code.

    Args:
        currency: Currency code (USD, RUB, UZS)

    Returns:
        Currency symbol
    """
    symbols = {
        'USD': '$',
        'RUB': '₽',
        'UZS': 'сум'
    }
    return symbols.get(currency, currency)
