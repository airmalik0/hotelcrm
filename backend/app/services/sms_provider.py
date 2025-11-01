from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings


class EskizAuthError(Exception):
    pass


class EskizSendError(Exception):
    def __init__(self, message: str, *, status_code: int | None = None, detail: Any | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail


@dataclass
class EskizToken:
    token: str
    expires_at: datetime

    def is_valid(self) -> bool:
        return datetime.now(timezone.utc) < self.expires_at - timedelta(seconds=30)


class EskizClient:
    """Minimal Eskiz SMS client with login, send and token caching."""

    def __init__(self) -> None:
        if not settings.ESKIZ_BASE_URL:
            raise ValueError("ESKIZ_BASE_URL is not configured")
        if not settings.ESKIZ_EMAIL or not settings.ESKIZ_PASSWORD:
            raise ValueError("ESKIZ_EMAIL/ESKIZ_PASSWORD are not configured")

        self.base_url = str(settings.ESKIZ_BASE_URL).rstrip("/")
        self.email = settings.ESKIZ_EMAIL
        self.password = settings.ESKIZ_PASSWORD
        self.sender_from = settings.ESKIZ_FROM
        self.callback_url = str(settings.ESKIZ_CALLBACK_URL) if settings.ESKIZ_CALLBACK_URL else None
        self._token: EskizToken | None = None
        self._client = httpx.Client(timeout=20.0)

    def _login(self) -> EskizToken:
        url = f"{self.base_url}/api/auth/login"
        payload = {"email": self.email, "password": self.password}
        resp = self._client.post(url, json=payload)
        if resp.status_code != 200:
            raise EskizAuthError(f"Eskiz login failed: {resp.status_code} {resp.text}")

        data = resp.json()
        # According to Eskiz, token response: { "data": {"token":"..."}, "message":"..." }
        token = data.get("data", {}).get("token") or data.get("token")
        if not token:
            raise EskizAuthError("Eskiz login response missing token")

        # Eskiz test tokens often expire in ~1 day; we set 20 hours by default
        expires_at = datetime.now(timezone.utc) + timedelta(hours=20)
        self._token = EskizToken(token=token, expires_at=expires_at)
        return self._token

    def _get_token(self) -> str:
        if self._token and self._token.is_valid():
            return self._token.token
        return self._login().token

    def send_sms(
        self,
        *,
        mobile_phone: str,
        message: str,
        from_sender: str | None = None,
        user_sms_id: str | None = None,
        callback_url: str | None = None,
    ) -> dict[str, Any]:
        """Send a single SMS via Eskiz.

        Returns provider response JSON. Raises EskizSendError on failure.
        """
        token = self._get_token()
        url = f"{self.base_url}/api/message/sms/send"

        headers = {"Authorization": f"Bearer {token}"}
        sender = from_sender or self.sender_from
        # Normalize phone to digits only (Eskiz expects 12-digit like 998XXXXXXXXX)
        mobile_phone_digits = re.sub(r"\D", "", mobile_phone)
        payload: dict[str, Any] = {
            "mobile_phone": mobile_phone_digits,
            "message": message,
        }
        if sender:
            payload["from"] = sender
        if callback_url or self.callback_url:
            payload["callback_url"] = callback_url or self.callback_url
        if user_sms_id:
            payload["user_sms_id"] = user_sms_id

        # Log request for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Eskiz SMS request: phone={mobile_phone_digits}, message={message[:50]}..., from={sender}")

        resp = self._client.post(url, json=payload, headers=headers)
        logger.info(f"Eskiz response status: {resp.status_code}, body: {resp.text[:200]}")

        if resp.status_code == 401:
            # Refresh token and retry once
            logger.info("Token expired, refreshing...")
            token = self._login().token
            headers["Authorization"] = f"Bearer {token}"
            resp = self._client.post(url, json=payload, headers=headers)
            logger.info(f"Retry response status: {resp.status_code}, body: {resp.text[:200]}")

        if resp.status_code >= 300:
            raise EskizSendError("Eskiz send failed", status_code=resp.status_code, detail=resp.text)

        return resp.json()


def get_eskiz_client() -> EskizClient:
    return EskizClient()


