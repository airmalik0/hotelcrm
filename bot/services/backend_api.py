"""
HTTP-клиент для работы с API бэкенда (session-based authentication).
"""
import logging
from datetime import datetime
from typing import Optional

import httpx

from config import settings
from schemas import BotUserPublic, SessionLoginRequest
from schemas import CustomerInquiryCreate

logger = logging.getLogger(__name__)


class BackendAPI:
    """Клиент для работы через API бэкенда."""

    def __init__(self) -> None:
        self._base_url = settings.backend_api_url
        self._headers = {"X-Telegram-Bot-Token": settings.telegram_token}

    async def _request(self, method: str, url: str, **kwargs) -> httpx.Response:
        headers = kwargs.pop("headers", {})
        headers.update(self._headers)
        max_attempts = 5
        backoff = 0.5
        last_exc: Exception | None = None
        for attempt in range(1, max_attempts + 1):
            try:
                async with httpx.AsyncClient(base_url=self._base_url, timeout=15.0, headers=headers) as client:
                    response = await client.request(method, url, **kwargs)
                    response.raise_for_status()
                    return response
            except Exception as e:
                last_exc = e
                logger.warning(f"HTTP {method} {url} failed on attempt {attempt}/{max_attempts}: {e}")
                if attempt < max_attempts:
                    import asyncio
                    await asyncio.sleep(backoff)
                    backoff *= 2
                else:
                    raise

    async def login(
        self,
        telegram_id: int,
        phone: str,
        name: str,
        surname: Optional[str] = None,
        birthdate: Optional[datetime] = None,
        language: str = "ru",
    ) -> Optional[BotUserPublic]:
        """Login: create or get bot user + create session"""
        try:
            login_request = SessionLoginRequest(
                telegram_id=telegram_id,
                phone=phone,
                name=name,
                surname=surname,
                birthdate=birthdate,
                language=language,
            )
            payload = login_request.model_dump(mode="json")
            resp = await self._request("POST", "/bot/sessions/login", json=payload)
            logger.info(f"Login successful for telegram_id {telegram_id} with phone {phone}")
            return BotUserPublic.model_validate(resp.json())
        except Exception as e:
            logger.error(f"Ошибка при login: {e}")
            return None

    async def get_session(self, telegram_id: int) -> Optional[BotUserPublic]:
        """Получить активную сессию (bot user) по telegram_id"""
        try:
            resp = await self._request("GET", f"/bot/sessions/{telegram_id}")
            return BotUserPublic.model_validate(resp.json())
        except Exception as e:
            logger.error(f"Ошибка при получении сессии для telegram_id {telegram_id}: {e}")
            return None

    async def get_user_with_context(self, telegram_id: int) -> Optional[dict]:
        """Получить пользователя с контекстом для AI"""
        try:
            resp = await self._request("GET", f"/bot/users/{telegram_id}")
            return resp.json()
        except Exception as e:
            logger.error(f"Ошибка при получении пользователя с контекстом для telegram_id {telegram_id}: {e}")
            return None

    async def logout(self, telegram_id: int) -> bool:
        """Logout: delete session for telegram_id"""
        try:
            resp = await self._request("DELETE", f"/bot/sessions/{telegram_id}")
            logger.info(f"Logout successful for telegram_id {telegram_id}")
            return 200 <= resp.status_code < 300
        except Exception as e:
            logger.error(f"Ошибка при logout {telegram_id}: {e}")
            return False

    async def update_user_language(self, telegram_id: int, language: str) -> bool:
        """Update language for current session's bot user"""
        try:
            payload = {"language": language}
            resp = await self._request("PUT", f"/bot/sessions/{telegram_id}", json=payload)
            logger.info(f"Language updated successfully for telegram_id {telegram_id} to {language}")
            return 200 <= resp.status_code < 300
        except Exception as e:
            logger.error(f"Ошибка при обновлении языка для telegram_id {telegram_id}: {e}")
            return False

    async def create_inquiry(self, inquiry: CustomerInquiryCreate) -> bool:
        """Создать обращение от бота через API."""
        try:
            resp = await self._request("POST", "/bot/inquiries", json=inquiry.model_dump(mode="json"))
            return 200 <= resp.status_code < 300
        except Exception as e:
            logger.error(f"Ошибка при создании обращения: {e}")
            return False
