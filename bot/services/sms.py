"""
SMS verification service with Eskiz.uz integration
"""
import logging
import random
import re
from datetime import datetime, timedelta
from typing import Dict, Tuple
from zoneinfo import ZoneInfo
from dataclasses import dataclass

import httpx

from config import settings

logger = logging.getLogger(__name__)

# Tashkent timezone (UTC+5)
TASHKENT_TZ = ZoneInfo("Asia/Tashkent")


class EskizAuthError(Exception):
    """Eskiz authentication error"""
    pass


class EskizSendError(Exception):
    """Eskiz SMS sending error"""
    def __init__(self, message: str, *, status_code: int | None = None, detail: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail


@dataclass
class EskizToken:
    """Eskiz auth token with expiration"""
    token: str
    expires_at: datetime

    def is_valid(self) -> bool:
        return datetime.now(TASHKENT_TZ) < self.expires_at - timedelta(seconds=30)


class EskizClient:
    """Eskiz SMS client for authentication and sending"""

    def __init__(self) -> None:
        if not settings.eskiz_base_url:
            raise ValueError("ESKIZ_BASE_URL is not configured")
        if not settings.eskiz_email or not settings.eskiz_password:
            raise ValueError("ESKIZ_EMAIL/ESKIZ_PASSWORD are not configured")
        if not settings.eskiz_from:
            raise ValueError("ESKIZ_FROM is not configured")

        self.base_url = str(settings.eskiz_base_url).rstrip("/")
        self.email = settings.eskiz_email
        self.password = settings.eskiz_password
        self.sender_from = settings.eskiz_from
        self._token: EskizToken | None = None
        self._client = httpx.AsyncClient(timeout=20.0)

    async def _login(self) -> EskizToken:
        """Login to Eskiz and get auth token"""
        url = f"{self.base_url}/api/auth/login"
        payload = {"email": self.email, "password": self.password}

        try:
            resp = await self._client.post(url, json=payload)
            if resp.status_code != 200:
                raise EskizAuthError(f"Eskiz login failed: {resp.status_code} {resp.text}")

            data = resp.json()
            # Extract token from response
            token = data.get("data", {}).get("token") or data.get("token")
            if not token:
                raise EskizAuthError("Eskiz login response missing token")

            # Token expires in ~20 hours
            expires_at = datetime.now(TASHKENT_TZ) + timedelta(hours=20)
            self._token = EskizToken(token=token, expires_at=expires_at)
            logger.info("Successfully authenticated with Eskiz")
            return self._token
        except httpx.RequestError as e:
            raise EskizAuthError(f"Eskiz login request failed: {e}")

    async def _get_token(self) -> str:
        """Get valid auth token, refreshing if needed"""
        if self._token and self._token.is_valid():
            return self._token.token
        return (await self._login()).token

    async def send_sms(
        self,
        *,
        mobile_phone: str,
        message: str,
    ) -> dict:
        """
        Send a single SMS via Eskiz.
        Returns provider response JSON. Raises EskizSendError on failure.
        """
        token = await self._get_token()
        url = f"{self.base_url}/api/message/sms/send"

        headers = {"Authorization": f"Bearer {token}"}

        # Normalize phone to digits only (Eskiz expects 998XXXXXXXXX format)
        mobile_phone_digits = re.sub(r"\D", "", mobile_phone)

        payload = {
            "mobile_phone": mobile_phone_digits,
            "message": message,
            "from": self.sender_from,
        }

        try:
            resp = await self._client.post(url, json=payload, headers=headers)

            if resp.status_code == 401:
                # Refresh token and retry once
                token = (await self._login()).token
                headers["Authorization"] = f"Bearer {token}"
                resp = await self._client.post(url, json=payload, headers=headers)

            if resp.status_code >= 300:
                raise EskizSendError(
                    "Eskiz send failed",
                    status_code=resp.status_code,
                    detail=resp.text
                )

            logger.info(f"SMS sent successfully via Eskiz to {mobile_phone_digits}")
            return resp.json()

        except httpx.RequestError as e:
            raise EskizSendError(f"Eskiz send request failed: {e}")

    async def close(self):
        """Close HTTP client"""
        await self._client.aclose()


class SMSService:
    """SMS verification service with Eskiz integration"""

    def __init__(self):
        # In-memory storage for verification codes
        self._codes: Dict[str, str] = {}
        self._attempts: Dict[str, int] = {}
        self._cooldowns: Dict[str, datetime] = {}
        self._enter_attempts: Dict[str, int] = {}
        self._code_timestamps: Dict[str, datetime] = {}

        # Eskiz client
        self._eskiz_client = EskizClient()

    def _generate_code(self) -> str:
        """Generate 4-digit verification code"""
        return str(random.randint(1000, 9999))

    def _cleanup_expired(self):
        """Clean up expired codes and cooldowns"""
        now = datetime.now(TASHKENT_TZ)

        # Clean expired codes (10 minutes)
        expired_codes = []
        for phone, timestamp in self._code_timestamps.items():
            if (now - timestamp).total_seconds() > 600:  # 10 minutes
                expired_codes.append(phone)

        for phone in expired_codes:
            self._codes.pop(phone, None)
            self._code_timestamps.pop(phone, None)
            self._enter_attempts.pop(phone, None)

        # Clean expired cooldowns
        expired_cooldowns = []
        for phone, cooldown_time in self._cooldowns.items():
            if now > cooldown_time:
                expired_cooldowns.append(phone)

        for phone in expired_cooldowns:
            self._cooldowns.pop(phone, None)

    async def get_attempts_info(self, phone: str) -> Dict[str, int]:
        """Get information about SMS sending attempts"""
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
        """Check if SMS can be sent"""
        try:
            info = await self.get_attempts_info(phone)
            cooldown_seconds = info["cooldown_seconds"]

            if cooldown_seconds > 0:
                minutes = cooldown_seconds // 60
                seconds = cooldown_seconds % 60
                return False, f"Подождите {minutes} мин {seconds} сек перед повторным запросом кода"

            return True, ""

        except Exception as e:
            logger.error(f"Error checking SMS send capability: {e}")
            return True, ""  # Allow sending on error

    async def send_sms_code(self, phone: str) -> Tuple[bool, str]:
        """
        Send SMS verification code
        Returns: (success, message)
        """
        try:
            # Check if SMS can be sent
            can_send, error_msg = await self.can_send_sms(phone)
            if not can_send:
                return False, error_msg

            # Generate code
            code = self._generate_code()

            # Format SMS message
            sms_text = f"Код подтверждения для регистрации в телеграм боте Local Hotel: {code}"

            # Send via Eskiz
            try:
                response = await self._eskiz_client.send_sms(
                    mobile_phone=phone,
                    message=sms_text
                )

                # Save code in memory for verification
                self._codes[phone] = code
                self._code_timestamps[phone] = datetime.now(TASHKENT_TZ)

                # Increase attempt counter
                self._attempts[phone] = self._attempts.get(phone, 0) + 1

                # Set cooldown (10 seconds)
                self._cooldowns[phone] = datetime.now(TASHKENT_TZ) + timedelta(seconds=10)

                # Reset enter attempts
                self._enter_attempts.pop(phone, None)

                logger.info(f"SMS code sent via Eskiz for phone {phone}")
                return True, "Код отправлен на ваш номер телефона"

            except EskizAuthError as e:
                logger.error(f"Eskiz authentication error: {e}")
                return False, "Ошибка аутентификации SMS сервиса. Попробуйте позже."

            except EskizSendError as e:
                logger.error(f"Eskiz send error: {e} (status: {e.status_code})")
                return False, "Ошибка при отправке SMS. Попробуйте позже."

        except Exception as e:
            logger.error(f"Error sending SMS code: {e}")
            return False, "Ошибка при отправке кода. Попробуйте позже."

    async def verify_sms_code(self, phone: str, entered_code: str) -> Tuple[bool, str]:
        """Verify entered SMS code"""
        try:
            self._cleanup_expired()

            # Get saved code
            saved_code = self._codes.get(phone)

            if not saved_code:
                return False, "Код истек или не был отправлен. Запросите новый код."

            # Check enter attempts
            enter_attempts = self._enter_attempts.get(phone, 0)

            if enter_attempts >= 3:
                # Delete code and reset attempts
                self._codes.pop(phone, None)
                self._code_timestamps.pop(phone, None)
                self._enter_attempts.pop(phone, None)
                return False, "Превышено количество попыток ввода. Запросите новый код."

            # Verify code
            if entered_code == saved_code:
                # Code is correct, clear all data
                self._codes.pop(phone, None)
                self._code_timestamps.pop(phone, None)
                self._enter_attempts.pop(phone, None)
                self._attempts.pop(phone, None)
                self._cooldowns.pop(phone, None)

                logger.info(f"SMS code successfully verified for phone {phone}")
                return True, "Код подтвержден"
            else:
                # Code is incorrect, increase enter attempts
                self._enter_attempts[phone] = enter_attempts + 1

                remaining_attempts = 3 - (enter_attempts + 1)
                if remaining_attempts > 0:
                    return False, f"Неверный код. Осталось попыток: {remaining_attempts}"
                else:
                    return False, "Неверный код. Запросите новый код."

        except Exception as e:
            logger.error(f"Error verifying SMS code: {e}")
            return False, "Ошибка при проверке кода. Попробуйте позже."

    async def cleanup_expired_codes(self):
        """Cleanup expired codes (called periodically)"""
        self._cleanup_expired()
        logger.debug("Expired SMS codes cleaned up")

    async def close(self):
        """Cleanup resources"""
        # Close Eskiz client
        await self._eskiz_client.close()

        # Clear in-memory data
        self._codes.clear()
        self._attempts.clear()
        self._cooldowns.clear()
        self._enter_attempts.clear()
        self._code_timestamps.clear()
