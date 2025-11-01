"""
Тип бизнеса: Отель
"""
import logging
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, List
from zoneinfo import ZoneInfo

from .base import BusinessType

logger = logging.getLogger(__name__)
TASHKENT_TZ = ZoneInfo("Asia/Tashkent")


class HotelBusinessType(BusinessType):
    """Тип бизнеса: Гостиница/Отель"""

    @property
    def type_id(self) -> str:
        return 'hotel'

    @property
    def display_name(self) -> Dict[str, str]:
        return {
            'ru': 'Отель',
            'uz': 'Mehmonxona',
            'en': 'Hotel',
            'zh': '酒店'
        }

    @property
    def emoji(self) -> str:
        return '🏨'

    def get_faq_path(self) -> str:
        """Путь к FAQ файлу отеля"""
        return "knowledge_base/hotel_faq.txt"

    def load_faq(self) -> str:
        """Загрузка FAQ из файла"""
        try:
            faq_path = Path(self.get_faq_path())
            if faq_path.exists():
                with open(faq_path, "r", encoding="utf-8") as f:
                    return f.read()
            else:
                logger.warning(f"FAQ файл не найден: {faq_path}")
                return ""
        except Exception as e:
            logger.error(f"Ошибка при загрузке FAQ: {e}")
            return ""

    def get_system_prompt_template(self) -> str:
        """Системный промпт для отеля"""
        return """
You are an empathetic AI assistant for a hotel complex. Your main mission is to help every guest feel heard and cared for by providing accurate information and promptly recording their requests.

### 1. FUNDAMENTAL PRINCIPLES

- **Truthfulness and Accuracy:**
  - NEVER make up information. Use ONLY what is EXPLICITLY stated in the KNOWLEDGE BASE.
  - NEVER promise certain solutions to the guest's problem. You can only pass the request to management.
  - DO NOT make logical inferences or assumptions about services, rules, possibilities, employees, or anything else.
  - If service, rule, possibility of something is not in the knowledge base, it doesn't always mean that it's not exist. It just means you don't know nothing about it.
  - When information is absent, say: "Unfortunately, I don't have exact information on this matter. I recommend checking with the staff."

- **Communication Language:**
  - Client chose `{language}` language when registered, so most likely he will speak in this language.
  - ALWAYS respond in the language the guest used in their message.
  - Clients most often speak Russian, Uzbek (Latin and Cyrillic), English, and Chinese. However, you can speak all languages in the world.
  - Clients may make spelling and grammatical errors. First determine the language and meaning of the message, then respond.
  - If you're unsure which language the client is speaking, always clarify:
    ```Which language would you like to continue in?
    На каком языке вы хотите продолжить диалог?
    Qaysi tilda davom etishni xohlaysiz?
    您想用哪种语言继续？```

- **Media Content:** When guest sends media files, they will appear as: 📷 [photo], 🎤 [voice message], 🎥 [video], 📄 [document], or 🎞 [GIF].
- Voice messages may be automatically transcribed to text for you. Transcriptions may be inaccurate.
- Photos may be provided. You will receive compressed versions of photos.
- You CANNOT view the actual content of other media types (video, document, GIF, location, etc.), but acknowledge receipt and ask the guest to describe what they wanted to show.

### 2. ABILITIES AND LIMITATIONS

#### Your abilities:
1. **Answering questions:** Providing information from the `KNOWLEDGE BASE`.
2. **Creating requests:** Recording detailed complaints and suggestions via the `create_request` function.

#### Your limitations (what you CANNOT do):
- CANNOT get real-time information from anyone.
- CANNOT perform ANY active actions: book, cancel, call, summon staff.
- CANNOT work with finances: give discounts, change prices, check order statuses.
- CANNOT promise available spots anywhere (spa, restaurant). Inform about possibilities, but don't guarantee them.
- CANNOT promise services (e.g., massage or cleaning) outside their official hours.

### 3. COMMUNICATION STYLE AND TONE

- **Brevity and warmth:** Communicate concisely (2-3 *short* sentences), but friendly. Add 1-2 appropriate emojis.
- **Empathy first:** First show you've heard and understood the guest's feelings, then move to actions. Work with emotions first. Let customer vent, gently gather facts, don't argue.
- **Variety:** Don't use the same template phrases.

### 4. REQUEST PROCESSES

#### Process for handling complaints and suggestions:
1. **Listen and show importance:** Pay attention to the guest's words, let them know their feedback is valuable.
2. **Record verbatim:** Don't interpret or rephrase the complaint or question. Your task is to convey the guest's words as accurately as possible.
3. **Maintain neutrality:** Never defend or criticize hotel, employees or other guests. Focus exclusively on the guest's situation and solving their problem.

4. **Before creating request:**
    - **ALWAYS collect details. WHAT, WHEN, WHERE, WHY, WHO (maybe name) etc,**
    - IF client provides a name, check if there is an employee with that name in the `KNOWLEDGE BASE`.
    - ASK follow-up questions.
    - ASK for clarification if you don't understand what the client means.
    - ASK what specifically was wrong in vague complaints like "bad food" or "poor service".
    - DO NOT ask more than 3 questions.
    - If client does not want to share details, explain that details will help resolve the issue faster: "Could you tell me more, please? The more details — the faster we can help." If the guest refuses — work with what you have.

5. **If guest provides date not from his booking dates:** Gently clarify: "Are you sure about the date? According to my records, you stayed with us [dates]." When creating, use the nearest real date with a note about the guest's date comment.

6. **If guest wants to change their already submitted request:** Create a NEW request with all updated information. Start the description with "UPD:" to indicate it's an updated version of a previous request.

7. **Completion:** After creating the request, thank the guest and inform them that management will definitely review their feedback.

### 5. DIALOGUE CONTEXT

- **KNOWLEDGE BASE:** `{faq_content}`
- Before answering a question about our hotel, consider **Truthfulness and Accuracy** principle.
"""

    def generate_context(self, user_id: int, user_phone: str, **kwargs) -> Dict[str, Any]:
        """
        Получение реального контекста для отеля из CRM (история заселений)

        NOTE: This method is deprecated. Context is now generated by backend API.
        This method is kept for compatibility but returns empty context.
        Use BackendAPI.get_user_with_context() instead.

        Возвращает:
        {
            "booking_dates": ["01.10.2025", "24.09.2025", "01.09.2025"],
            "bookings_info": [
                {"date": "01.10.2025", "room": "101", "status": "checked_out"},
                {"date": "24.09.2025", "room": "205", "status": "checked_in"},
                {"date": "01.09.2025", "room": "312", "status": "confirmed"}
            ]
        }
        """
        logger.warning("generate_context() is deprecated. Context is now fetched from backend API.")
        return {"booking_dates": [], "bookings_info": []}

    def format_context_for_prompt(self, context: Dict[str, Any]) -> str:
        """Форматирование контекста для AI промпта (на английском для лучшего понимания AI)"""
        try:
            bookings_info = context.get("bookings_info", [])

            if not bookings_info:
                return "- Stay dates: `no check-in data`"

            # Форматируем детальную информацию о каждой брони
            booking_details = []
            for booking in bookings_info:
                check_in = booking.get("check_in", "N/A")
                check_out = booking.get("check_out", "N/A")
                room = booking.get("room", "N/A")
                status = booking.get("status", "unknown")
                
                # Формируем базовую строку на английском для AI
                base_info = f"{check_in} to {check_out} (room {room}, status: {status})"
                
                # Добавляем фактические даты, если есть
                actual_parts = []
                actual_check_in = booking.get("actual_check_in")
                if actual_check_in:
                    actual_parts.append(f"actual check-in: {actual_check_in}")
                
                actual_check_out = booking.get("actual_check_out")
                if actual_check_out:
                    actual_parts.append(f"actual check-out: {actual_check_out}")
                
                if actual_parts:
                    base_info += f" [{', '.join(actual_parts)}]"
                
                # Добавляем количество ночей и сумму, если есть
                nights = booking.get("nights")
                total_amount = booking.get("total_amount")
                if nights:
                    base_info += f", {nights} nights"
                if total_amount:
                    base_info += f", amount: {total_amount:.0f}"
                
                booking_details.append(base_info)

            details_str = "\n  - ".join([""] + booking_details)
            return f"- Booking history:{details_str}"
        except Exception as e:
            logger.error(f"Ошибка форматирования контекста: {e}")
            return "- Stay dates: `error loading data`"

    def format_history_display(self, context: Dict[str, Any], language: str) -> str:
        """Форматирование истории заселений для пользователя"""
        try:
            bookings_info = context.get("bookings_info", [])

            if not bookings_info:
                translations = {
                    'ru': '• История заселений не найдена',
                    'uz': '• Turar joy tarixi topilmadi',
                    'en': '• No booking history found',
                    'zh': '• 未找到预订历史'
                }
                return translations.get(language, translations['en'])

            # Формируем детальный список броней
            lines = []
            for booking in bookings_info:
                check_in = booking.get("check_in", "")
                check_out = booking.get("check_out", "")
                room = booking.get("room", "N/A")
                status = booking.get("status", "unknown")
                actual_check_in = booking.get("actual_check_in")
                actual_check_out = booking.get("actual_check_out")

                # Локализованный формат
                if language == 'ru':
                    base_line = f"• {check_in} - {check_out} (номер {room}, {status})"
                    if actual_check_in or actual_check_out:
                        actual_parts = []
                        if actual_check_in:
                            actual_parts.append(f"заезд: {actual_check_in}")
                        if actual_check_out:
                            actual_parts.append(f"выезд: {actual_check_out}")
                        base_line += f" [факт: {', '.join(actual_parts)}]"
                    lines.append(base_line)
                elif language == 'uz':
                    base_line = f"• {check_in} - {check_out} (xona {room}, {status})"
                    if actual_check_in or actual_check_out:
                        actual_parts = []
                        if actual_check_in:
                            actual_parts.append(f"kirish: {actual_check_in}")
                        if actual_check_out:
                            actual_parts.append(f"chiqish: {actual_check_out}")
                        base_line += f" [fakt: {', '.join(actual_parts)}]"
                    lines.append(base_line)
                elif language == 'zh':
                    base_line = f"• {check_in} - {check_out} (房间 {room}, {status})"
                    if actual_check_in or actual_check_out:
                        actual_parts = []
                        if actual_check_in:
                            actual_parts.append(f"入住: {actual_check_in}")
                        if actual_check_out:
                            actual_parts.append(f"退房: {actual_check_out}")
                        base_line += f" [实际: {', '.join(actual_parts)}]"
                    lines.append(base_line)
                else:  # en
                    base_line = f"• {check_in} - {check_out} (room {room}, {status})"
                    if actual_check_in or actual_check_out:
                        actual_parts = []
                        if actual_check_in:
                            actual_parts.append(f"check-in: {actual_check_in}")
                        if actual_check_out:
                            actual_parts.append(f"check-out: {actual_check_out}")
                        base_line += f" [actual: {', '.join(actual_parts)}]"
                    lines.append(base_line)

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Ошибка форматирования истории: {e}")
            return "• Error loading history"

    def validate_context(self, context: Dict[str, Any]) -> bool:
        """Валидация контекста отеля"""
        try:
            # Проверяем наличие обязательных полей
            if not isinstance(context, dict):
                return False

            if "booking_dates" not in context or "bookings_info" not in context:
                return False

            # Проверяем типы
            if not isinstance(context["booking_dates"], list):
                return False

            if not isinstance(context["bookings_info"], list):
                return False

            # Проверяем структуру bookings_info
            for booking in context["bookings_info"]:
                if not isinstance(booking, dict):
                    return False
                # Проверяем обязательные поля: check_in, check_out, room, status
                if "check_in" not in booking or "check_out" not in booking:
                    return False
                if "room" not in booking or "status" not in booking:
                    return False

            return True
        except Exception as e:
            logger.error(f"Ошибка валидации контекста: {e}")
            return False
