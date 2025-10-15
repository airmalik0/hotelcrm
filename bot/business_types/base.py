"""
Базовый абстрактный класс для типов бизнеса
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BusinessType(ABC):
    """Абстрактный класс для типов бизнеса"""

    @property
    @abstractmethod
    def type_id(self) -> str:
        """Уникальный ID типа (hotel, restaurant, realtor)"""
        pass

    @property
    @abstractmethod
    def display_name(self) -> Dict[str, str]:
        """Название для отображения {'ru': 'Отель', 'en': 'Hotel'}"""
        pass

    @property
    @abstractmethod
    def emoji(self) -> str:
        """Эмодзи для типа бизнеса"""
        pass

    @abstractmethod
    def get_faq_path(self) -> str:
        """Путь к файлу FAQ"""
        pass

    @abstractmethod
    def load_faq(self) -> str:
        """Загрузить содержимое FAQ"""
        pass

    @abstractmethod
    def get_system_prompt_template(self) -> str:
        """Получить шаблон системного промпта"""
        pass

    @abstractmethod
    def generate_context(self, user_id: int, user_phone: str, **kwargs) -> Dict[str, Any]:
        """Генерировать контекст для конкретного пользователя"""
        pass

    @abstractmethod
    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """Форматировать контекст для вставки в промпт"""
        pass

    @abstractmethod
    def format_history_display(self, context: Dict[str, Any], language: str) -> str:
        """Форматировать историю для показа пользователю при регистрации"""
        pass

    @abstractmethod
    def validate_context(self, context: Dict[str, Any]) -> bool:
        """Валидация контекста"""
        pass

    def get_context(self, user_phone: str, stored_context: Optional[str]) -> Dict[str, Any]:
        """
        Получить контекст: либо распарсить из БД, либо сгенерировать новый

        Args:
            user_phone: Номер телефона пользователя
            stored_context: JSON строка из БД (может быть None или пустая)

        Returns:
            Dict с контекстом для данного типа бизнеса
        """
        import json
        import logging

        logger = logging.getLogger(__name__)

        # Если есть сохраненный контекст - парсим его
        if stored_context:
            try:
                context = json.loads(stored_context)
                # Валидируем распарсенный контекст
                if self.validate_context(context):
                    return context
                else:
                    logger.warning(f"Invalid context structure for {self.type_id}, regenerating")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse stored context: {e}, regenerating")

        # Если контекста нет или он битый - генерируем новый
        # Для generate_context нужен user_id, но его у нас нет на этом этапе
        # Используем 0 как placeholder - конкретные типы могут игнорировать его
        return self.generate_context(user_id=0, user_phone=user_phone)
