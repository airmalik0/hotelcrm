"""
Сервис резервного копирования базы данных с доставкой в Telegram.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Sequence

import httpx

from app.core.config import settings


logger = logging.getLogger(__name__)


class BackupService:
    """Сервис для создания резервной копии базы данных и отправки её по частям в Telegram."""

    TELEGRAM_API_URL_TEMPLATE = "https://api.telegram.org/bot{token}/{method}"

    def __init__(self) -> None:
        self.backup_enabled = settings.BACKUP_ENABLED
        self.backup_dir = Path(settings.BACKUP_DIRECTORY)
        split_size_mb = max(1, settings.BACKUP_SPLIT_SIZE_MB)
        self.split_size_bytes = split_size_mb * 1024 * 1024
        self.telegram_token = settings.TELEGRAM_TOKEN
        self.telegram_chat_id = settings.TELEGRAM_ADMIN_ID

    def _detect_pg_dump(self) -> str:
        """Проверить наличие утилиты pg_dump."""
        path = shutil.which("pg_dump")
        if path is None:
            raise FileNotFoundError(
                "Утилита pg_dump не найдена в контейнере. "
                "Убедитесь, что установлен пакет postgresql-client."
            )
        return path

    def _ensure_backup_dir(self) -> None:
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def create_backup(self) -> tuple[Path, str]:
        """Создать резервную копию базы данных."""
        if not self.backup_enabled:
            logger.info("Резервное копирование отключено настройками (BACKUP_ENABLED=false)")
            raise RuntimeError("Backup disabled by configuration")

        self._ensure_backup_dir()
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"hotelcrm_backup_{timestamp}.dump"
        dump_path = self.backup_dir / filename

        logger.info("Запуск pg_dump для создания бэкапа: %s", dump_path)
        env = os.environ.copy()
        env["PGPASSWORD"] = settings.POSTGRES_PASSWORD

        pg_dump_path = self._detect_pg_dump()

        command = [
            pg_dump_path,
            "-h",
            settings.POSTGRES_SERVER,
            "-p",
            str(settings.POSTGRES_PORT),
            "-U",
            settings.POSTGRES_USER,
            "-d",
            settings.POSTGRES_DB,
            "-Fc",
            "-f",
            str(dump_path),
        ]

        subprocess.run(command, check=True, env=env)
        logger.info("Создана резервная копия базы данных (%s)", dump_path)
        return dump_path, timestamp

    def split_backup(self, dump_path: Path) -> Sequence[Path]:
        """Разбить файл бэкапа на части в соответствии с ограничением Telegram."""
        file_size = dump_path.stat().st_size
        if file_size <= self.split_size_bytes:
            logger.info(
                "Размер бэкапа %s не превышает порог (%d байт), отправляем как один файл",
                dump_path,
                self.split_size_bytes,
            )
            return [dump_path]

        logger.info(
            "Разбиваем бэкап %s (%d байт) на части по %d байт",
            dump_path,
            file_size,
            self.split_size_bytes,
        )

        parts: list[Path] = []
        with dump_path.open("rb") as source:
            index = 1
            while True:
                chunk = source.read(self.split_size_bytes)
                if not chunk:
                    break

                part_name = f"{dump_path.stem}.part{index:02d}{dump_path.suffix}"
                part_path = dump_path.with_name(part_name)
                with part_path.open("wb") as destination:
                    destination.write(chunk)
                parts.append(part_path)
                logger.debug("Создан фрагмент бэкапа: %s", part_path)
                index += 1

        dump_path.unlink()
        logger.info("Оригинальный файл бэкапа удалён после разбиения: %s", dump_path)
        return parts

    def _cleanup_old_backups(self, keep_files: Sequence[Path]) -> None:
        """Удалить старые файлы бэкапов, оставив только текущие."""
        keep_names = {path.name for path in keep_files}
        removed = 0
        for file_path in self.backup_dir.glob("*.dump"):
            if file_path.name in keep_names:
                continue
            try:
                file_path.unlink(missing_ok=True)
                removed += 1
                logger.debug("Удалён устаревший бэкап: %s", file_path)
            except OSError as exc:
                logger.warning(
                    "Не удалось удалить устаревший бэкап %s: %s",
                    file_path,
                    exc,
                )
        if removed:
            logger.info("Удалено %d устаревших бэкап-файлов", removed)

    def send_to_telegram(self, files: Iterable[Path], timestamp: str) -> None:
        """Отправить части бэкапа в Telegram."""
        if not self.telegram_token or not self.telegram_chat_id:
            logger.warning(
                "Телеграм токен или chat_id не заданы. Бэкап %s останется только локально.",
                timestamp,
            )
            return

        url = self.TELEGRAM_API_URL_TEMPLATE.format(token=self.telegram_token, method="sendDocument")
        files_list = list(files)
        total_parts = len(files_list)
        logger.info(
            "Начинаем отправку бэкапа %s в Telegram (%d частей)",
            timestamp,
            total_parts,
        )

        with httpx.Client(timeout=httpx.Timeout(120.0)) as client:
            for idx, file_path in enumerate(files_list, start=1):
                caption = (
                    f"📦 Бэкап базы данных {timestamp} "
                    f"(часть {idx} из {total_parts}, размер {file_path.stat().st_size // 1024} КБ)"
                )
                try:
                    with file_path.open("rb") as file_handle:
                        response = client.post(
                            url,
                            data={"chat_id": str(self.telegram_chat_id), "caption": caption},
                            files={"document": (file_path.name, file_handle)},
                        )
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    logger.error(
                        "Ошибка отправки части бэкапа %s в Telegram: %s",
                        file_path,
                        exc.response.text,
                    )
                    raise
                except httpx.RequestError as exc:
                    logger.error(
                        "Сетевая ошибка при отправке части бэкапа %s в Telegram: %s",
                        file_path,
                        exc,
                    )
                    raise

                logger.info("Часть бэкапа отправлена: %s", file_path.name)

    def run_backup_pipeline(self) -> None:
        """Запустить полный цикл резервного копирования и рассылки."""
        try:
            dump_path, timestamp = self.create_backup()
            parts = self.split_backup(dump_path)
            self._cleanup_old_backups(parts)
            self.send_to_telegram(parts, timestamp)
            logger.info("Резервное копирование %s завершено успешно", timestamp)
        except Exception:
            logger.exception("Ошибка при выполнении резервного копирования")


def run_scheduled_backup() -> None:
    """Функция-обёртка для планировщика APScheduler."""
    service = BackupService()
    service.run_backup_pipeline()


