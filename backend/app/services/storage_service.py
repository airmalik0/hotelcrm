import os
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from pathlib import Path


class StorageService(ABC):
    @abstractmethod
    async def save_file(self, file_content: bytes, filename: str, report_type: str) -> str:
        pass

    @abstractmethod
    async def get_file(self, file_path: str) -> bytes | None:
        pass

    @abstractmethod
    async def delete_file(self, file_path: str) -> bool:
        pass

    @abstractmethod
    async def list_files(self, prefix: str = "") -> list[str]:
        pass

    @abstractmethod
    async def cleanup_old_files(self, days: int = 30) -> int:
        pass


class LocalStorageService(StorageService):
    def __init__(self, base_path: str = "/app/reports"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _get_file_path(self, report_type: str, filename: str) -> Path:
        now = datetime.utcnow()
        year_month = now.strftime("%Y-%m")
        dir_path = self.base_path / year_month
        dir_path.mkdir(parents=True, exist_ok=True)

        # Add timestamp and unique id to filename to avoid collisions
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        base_name, ext = os.path.splitext(filename)
        final_filename = f"{report_type}_{timestamp}_{unique_id}{ext}"

        return dir_path / final_filename

    async def save_file(self, file_content: bytes, filename: str, report_type: str) -> str:
        file_path = self._get_file_path(report_type, filename)

        with open(file_path, "wb") as f:
            f.write(file_content)

        # Return relative path from base_path
        return str(file_path.relative_to(self.base_path))

    async def get_file(self, file_path: str) -> bytes | None:
        full_path = self.base_path / file_path

        if not full_path.exists():
            return None

        with open(full_path, "rb") as f:
            return f.read()

    async def delete_file(self, file_path: str) -> bool:
        full_path = self.base_path / file_path

        if not full_path.exists():
            return False

        try:
            full_path.unlink()
            return True
        except Exception:
            return False

    async def list_files(self, prefix: str = "") -> list[str]:
        files = []

        for file_path in self.base_path.rglob("*"):
            if file_path.is_file():
                relative_path = str(file_path.relative_to(self.base_path))
                if not prefix or relative_path.startswith(prefix):
                    files.append(relative_path)

        return sorted(files)

    async def cleanup_old_files(self, days: int = 30) -> int:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        deleted_count = 0

        for file_path in self.base_path.rglob("*"):
            if file_path.is_file():
                # Get file modification time
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime)

                if mtime < cutoff_date:
                    try:
                        file_path.unlink()
                        deleted_count += 1
                    except Exception:
                        pass

        # Clean up empty directories
        for dir_path in sorted(self.base_path.rglob("*"), reverse=True):
            if dir_path.is_dir() and not any(dir_path.iterdir()):
                try:
                    dir_path.rmdir()
                except Exception:
                    pass

        return deleted_count


# Future S3 implementation placeholder
class S3StorageService(StorageService):
    def __init__(self, bucket_name: str, aws_access_key_id: str, aws_secret_access_key: str, region: str = "us-east-1"):
        # This will be implemented when migrating to S3
        # Will use boto3 for S3 operations
        raise NotImplementedError("S3 storage service not yet implemented")

    async def save_file(self, file_content: bytes, filename: str, report_type: str) -> str:
        raise NotImplementedError()

    async def get_file(self, file_path: str) -> bytes | None:
        raise NotImplementedError()

    async def delete_file(self, file_path: str) -> bool:
        raise NotImplementedError()

    async def list_files(self, prefix: str = "") -> list[str]:
        raise NotImplementedError()

    async def cleanup_old_files(self, days: int = 30) -> int:
        raise NotImplementedError()


# Singleton instance
storage_service: StorageService = LocalStorageService()
