"""
Сервис SMS верификации (заглушка)
"""
import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

# Таймзона Ташкента (UTC+5)
TASHKENT_TZ = ZoneInfo("Asia/Tashkent")

class SMSService:
    """Сервис SMS верификации с заглушкой (хранение в памяти)"""
    
    def __init__(self):
        # Простое хранение в памяти для MVP
        self._codes: Dict[str, str] = {}
        self._attempts: Dict[str, int] = {}
        self._cooldowns: Dict[str, datetime] = {}
        self._enter_attempts: Dict[str, int] = {}
        self._code_timestamps: Dict[str, datetime] = {}
    
    def _generate_code(self) -> str:
        """Генерация 4-значного кода"""
        return str(random.randint(1000, 9999))
    
    
    def _cleanup_expired(self):
        """Очистка истекших данных"""
        now = datetime.now(TASHKENT_TZ)
        
        # Очистка истекших кодов (10 минут)
        expired_codes = []
        for phone, timestamp in self._code_timestamps.items():
            if (now - timestamp).total_seconds() > 600:  # 10 минут
                expired_codes.append(phone)
        
        for phone in expired_codes:
            self._codes.pop(phone, None)
            self._code_timestamps.pop(phone, None)
            self._enter_attempts.pop(phone, None)
        
        # Очистка истекших кулдаунов
        expired_cooldowns = []
        for phone, cooldown_time in self._cooldowns.items():
            if now > cooldown_time:
                expired_cooldowns.append(phone)
        
        for phone in expired_cooldowns:
            self._cooldowns.pop(phone, None)
    
    async def get_attempts_info(self, phone: str) -> Dict[str, int]:
        """Получить информацию о попытках отправки SMS"""
        self._cleanup_expired()
        
        attempts = self._attempts.get(phone, 0)
        cooldown_time = self._cooldowns.get(phone)
        
        if cooldown_time:
            cooldown_seconds = max(0, int((cooldown_time - datetime.now(TASHKENT_TZ)).total_seconds()))
        else:
            cooldown_seconds = 0
        
        return {
            "attempts": attempts,
            "cooldown_seconds": cooldown_seconds
        }
    
    async def can_send_sms(self, phone: str) -> Tuple[bool, str]:
        """Проверить, можно ли отправить SMS"""
        try:
            info = await self.get_attempts_info(phone)
            cooldown_seconds = info["cooldown_seconds"]

            if cooldown_seconds > 0:
                minutes = cooldown_seconds // 60
                seconds = cooldown_seconds % 60
                return False, f"Подождите {minutes} мин {seconds} сек перед повторным запросом кода"

            return True, ""

        except Exception as e:
            logger.error(f"Ошибка при проверке возможности отправки SMS: {e}")
            return True, ""  # В случае ошибки разрешаем отправку
    
    async def send_sms_code(self, phone: str) -> Tuple[bool, str, Optional[str]]:
        """
        Отправить SMS код (заглушка)
        Возвращает: (success, message, code_in_test_mode)
        """
        try:
            # Проверяем, можно ли отправить SMS
            can_send, error_msg = await self.can_send_sms(phone)
            if not can_send:
                return False, error_msg, None
            
            # Генерируем код
            code = self._generate_code()
            
            # Выводим код в консоль (заглушка)
            print(f"\n" + "="*50)
            print(f"SMS КОД ДЛЯ ТЕЛЕФОНА {phone}: {code}")
            print(f"Время отправки: {datetime.now(TASHKENT_TZ).strftime('%H:%M:%S')}")
            print("="*50 + "\n")
            
            # Сохраняем код в памяти
            self._codes[phone] = code
            self._code_timestamps[phone] = datetime.now(TASHKENT_TZ)
            
            # Увеличиваем счетчик попыток
            self._attempts[phone] = self._attempts.get(phone, 0) + 1

            # Всегда устанавливаем кулдаун 10 секунд
            self._cooldowns[phone] = datetime.now(TASHKENT_TZ) + timedelta(seconds=10)
            
            # Сбрасываем счетчик попыток ввода кода
            self._enter_attempts.pop(phone, None)
            
            logger.info(f"SMS код {code} отправлен для телефона {phone}")

            # Возвращаем код (для удобства тестирования)
            return True, "Код отправлен на ваш номер телефона", code
        
        except Exception as e:
            logger.error(f"Ошибка при отправке SMS кода: {e}")
            return False, "Ошибка при отправке кода. Попробуйте позже.", None
    
    async def verify_sms_code(self, phone: str, entered_code: str) -> Tuple[bool, str]:
        """Проверить введенный SMS код"""
        try:
            self._cleanup_expired()
            
            # Получаем сохраненный код
            saved_code = self._codes.get(phone)
            
            if not saved_code:
                return False, "Код истек или не был отправлен. Запросите новый код."
            
            # Проверяем количество попыток ввода
            enter_attempts = self._enter_attempts.get(phone, 0)
            
            if enter_attempts >= 3:
                # Удаляем код и сбрасываем попытки
                self._codes.pop(phone, None)
                self._code_timestamps.pop(phone, None)
                self._enter_attempts.pop(phone, None)
                return False, "Превышено количество попыток ввода. Запросите новый код."
            
            # Проверяем код
            if entered_code == saved_code:
                # Код верный, удаляем его и сбрасываем все счетчики
                self._codes.pop(phone, None)
                self._code_timestamps.pop(phone, None)
                self._enter_attempts.pop(phone, None)
                self._attempts.pop(phone, None)
                self._cooldowns.pop(phone, None)
                
                logger.info(f"SMS код успешно подтвержден для телефона {phone}")
                return True, "Код подтвержден"
            else:
                # Код неверный, увеличиваем счетчик попыток ввода
                self._enter_attempts[phone] = enter_attempts + 1
                
                remaining_attempts = 3 - (enter_attempts + 1)
                if remaining_attempts > 0:
                    return False, f"Неверный код. Осталось попыток: {remaining_attempts}"
                else:
                    return False, "Неверный код. Запросите новый код."
        
        except Exception as e:
            logger.error(f"Ошибка при проверке SMS кода: {e}")
            return False, "Ошибка при проверке кода. Попробуйте позже."
    
    async def cleanup_expired_codes(self):
        """Очистка истекших кодов (вызывается периодически)"""
        self._cleanup_expired()
        logger.debug("Очистка истекших SMS кодов выполнена")
    
    async def close(self):
        """Очистка ресурсов"""
        # Для in-memory хранения просто очищаем данные
        self._codes.clear()
        self._attempts.clear()
        self._cooldowns.clear()
        self._enter_attempts.clear()
        self._code_timestamps.clear() 