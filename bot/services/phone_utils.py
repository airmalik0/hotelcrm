"""
Утилиты для работы с телефонными номерами
"""
import re
import logging
from typing import Optional
import phonenumbers

logger = logging.getLogger(__name__)


def normalize_phone(phone: str) -> Optional[str]:
    """
    Нормализация номера телефона в формат E164
    
    Args:
        phone: Номер телефона в любом формате
    
    Returns:
        Нормализованный номер в формате E164 или None если не удалось
    """
    if not phone:
        return None
    
    try:
        # Удаляем все пробелы и специальные символы, оставляем только цифры
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        # Проверяем, что это действительно номер телефона (не время или другие данные)
        if len(clean_phone) < 9 or len(clean_phone) > 15:
            return None
        
        # Узбекские номера обычно начинаются с 90, 91, 93, 94, 95, 97, 98, 99
        uzbek_prefixes = ['90', '91', '93', '94', '95', '97', '98', '99']
        
        # Если номер начинается с узбекского префикса и длина 9 цифр
        if len(clean_phone) == 9 and any(clean_phone.startswith(prefix) for prefix in uzbek_prefixes):
            clean_phone = '+998' + clean_phone
        
        # Если номер уже содержит код страны 998
        elif clean_phone.startswith('998') and len(clean_phone) == 12:
            clean_phone = '+' + clean_phone
        
        # Российские номера
        elif clean_phone.startswith('8') and len(clean_phone) == 11:
            clean_phone = '+7' + clean_phone[1:]
        elif clean_phone.startswith('7') and len(clean_phone) == 11:
            clean_phone = '+' + clean_phone
        elif len(clean_phone) == 10:
            clean_phone = '+7' + clean_phone
        
        # Валидируем номер через phonenumbers (пробуем UZ и RU)
        try:
            # Сначала пробуем как узбекский номер
            parsed = phonenumbers.parse(clean_phone, "UZ")
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except:
            pass
        
        try:
            # Потом как российский
            parsed = phonenumbers.parse(clean_phone, "RU")
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except:
            pass
        
        # Если валидация не прошла, возвращаем None
        logger.warning(f"Не удалось нормализовать номер телефона: {phone}")
        return None
    
    except Exception as e:
        logger.error(f"Ошибка при нормализации телефона {phone}: {e}")
        return None


def validate_phone_format(phone: str) -> bool:
    """
    Валидация формата номера телефона
    
    Args:
        phone: Номер телефона для проверки
    
    Returns:
        True если формат корректный, False иначе
    """
    # Универсальный паттерн для телефонных номеров любой страны
    pattern = r'^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$'
    
    return bool(re.match(pattern, phone))


def normalize_phone_display(phone: str) -> str:
    """
    Нормализация номера для отображения пользователю
    
    Args:
        phone: Номер телефона
    
    Returns:
        Нормализованный номер для отображения
    """
    clean_phone = re.sub(r'[^\d+]', '', phone)
    
    # Узбекские номера
    uzbek_prefixes = ['90', '91', '93', '94', '95', '97', '98', '99']
    
    # Если номер начинается с узбекского префикса и длина 9 цифр
    if len(clean_phone) == 9 and any(clean_phone.startswith(prefix) for prefix in uzbek_prefixes):
        return '+998' + clean_phone
    
    # Если номер уже содержит код страны 998
    elif clean_phone.startswith('998') and len(clean_phone) == 12:
        return '+' + clean_phone
    elif clean_phone.startswith('+998') and len(clean_phone) == 13:
        return clean_phone
    
    # Российские номера
    elif clean_phone.startswith('+7') and len(clean_phone) == 12:
        return clean_phone
    elif clean_phone.startswith('8') and len(clean_phone) == 11:
        return '+7' + clean_phone[1:]
    elif clean_phone.startswith('7') and len(clean_phone) == 11:
        return '+' + clean_phone
    elif len(clean_phone) == 10:
        return '+7' + clean_phone
    
    # Для других коротких номеров оставляем как есть
    return clean_phone