"""
HTTP-клиент для работы с API бэкенда.
"""
import logging
from datetime import datetime
from typing import Optional

import httpx

from config import settings
from schemas import BotUserCreate, BotUserPublic
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

    async def create_or_update_user(
        self,
        telegram_id: int,
        phone: str,
        name: str,
        surname: Optional[str] = None,
        birthdate: Optional[datetime] = None,
        language: str = "ru",
        business_type: str = "hotel",
    ) -> Optional[BotUserPublic]:
        """Создать/обновить пользователя бота через API"""
        try:
            user_data = BotUserCreate(
                telegram_id=telegram_id,
                phone=phone,
                name=name,
                surname=surname,
                birthdate=birthdate,
                language=language,
                business_type=business_type,
            )
            payload = user_data.model_dump(mode="json")
            resp = await self._request("POST", "/bot/users/upsert", json=payload)
            logger.info("Создан/обновлён пользователь бота через API")
            return BotUserPublic.model_validate(resp.json())
        except Exception as e:
            logger.error(f"Ошибка при создании/обновлении пользователя: {e}")
            return None

    async def get_user_by_telegram_id(self, telegram_id: int) -> Optional[BotUserPublic]:
        """Получить пользователя по Telegram ID"""
        try:
            resp = await self._request("GET", f"/bot/users/by-telegram-id", params={"telegram_id": telegram_id})
            return BotUserPublic.model_validate(resp.json())
        except Exception as e:
            logger.error(f"Ошибка при получении пользователя по telegram_id {telegram_id}: {e}")
            return None

    async def get_user_with_context(self, telegram_id: int) -> Optional[dict]:
        """Получить пользователя с контекстом для AI"""
        try:
            resp = await self._request("GET", f"/bot/users/{telegram_id}")
            return resp.json()
        except Exception as e:
            logger.error(f"Ошибка при получении пользователя с контекстом для telegram_id {telegram_id}: {e}")
            return None

    async def get_user_by_phone(self, phone: str) -> Optional[BotUserPublic]:
        """Получить пользователя по номеру телефона (временно через список и фильтр)"""
        try:
            resp = await self._request("GET", "/bot/users", params={"skip": 0, "limit": 100})
            users = [BotUserPublic.model_validate(u) for u in resp.json().get("data", [])]
            for u in users:
                if u.phone == phone:
                    return u
            return None
        except Exception as e:
            logger.error(f"Ошибка при получении пользователя по телефону {phone}: {e}")
            return None

    async def update_user_language(self, telegram_id: int, language: str) -> bool:
        """Обновить язык пользователя (через upsert)"""
        try:
            payload = {"telegram_id": telegram_id, "language": language}
            resp = await self._request("POST", "/bot/users/upsert", json=payload)
            return resp.status_code == 200
        except Exception as e:
            logger.error(f"Ошибка при обновлении языка пользователя {telegram_id}: {e}")
            return False

    async def delete_user(self, telegram_id: int) -> bool:
        """Удаление через API пока не требуется; всегда False"""
        return False

    async def create_inquiry(self, inquiry: CustomerInquiryCreate) -> bool:
        """Создать обращение от бота через API."""
        try:
            resp = await self._request("POST", "/bot/inquiries", json=inquiry.model_dump(mode="json"))
            return 200 <= resp.status_code < 300
        except Exception as e:
            logger.error(f"Ошибка при создании обращения: {e}")
            return False
