"""
Менеджер локализации
"""
from typing import Dict, Optional
import logging

from .ru import TRANSLATIONS as RU_TRANSLATIONS
from .uz import TRANSLATIONS as UZ_TRANSLATIONS
from .en import TRANSLATIONS as EN_TRANSLATIONS
from .zh import TRANSLATIONS as ZH_TRANSLATIONS

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    'ru': '🇷🇺 Русский',
    'uz': '🇺🇿 O\'zbek',
    'en': '🇬🇧 English',
    'zh': '🇨🇳 中文'
}

class LocalizationManager:
    """Менеджер для работы с переводами"""
    
    def __init__(self):
        self.translations = {
            'ru': RU_TRANSLATIONS,
            'uz': UZ_TRANSLATIONS,
            'en': EN_TRANSLATIONS,
            'zh': ZH_TRANSLATIONS
        }
    
    def get_text(self, key: str, lang: str = 'ru') -> str:
        """
        Получить перевод по ключу для заданного языка
        
        Args:
            key: Ключ перевода
            lang: Код языка (ru, uz, en, zh)
        
        Returns:
            Переведенный текст или ключ если перевод не найден
        """
        if lang not in self.translations:
            logger.warning(f"Unsupported language: {lang}, falling back to Russian")
            lang = 'ru'
        
        translations = self.translations[lang]
        
        # Поддержка вложенных ключей через точку
        keys = key.split('.')
        value = translations
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                logger.warning(f"Translation not found for key: {key} in language: {lang}")
                # Fallback на русский
                if lang != 'ru':
                    return self.get_text(key, 'ru')
                return key
        
        return value
    
    def get_language_keyboard_data(self) -> list:
        """Получить данные для клавиатуры выбора языка"""
        return [(code, name) for code, name in SUPPORTED_LANGUAGES.items()]

# Глобальный экземпляр менеджера
_manager = LocalizationManager()

def get_text(key: str, lang: str = 'ru') -> str:
    """
    Быстрый доступ к переводам
    
    Args:
        key: Ключ перевода
        lang: Код языка
    
    Returns:
        Переведенный текст
    """
    return _manager.get_text(key, lang)