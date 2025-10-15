"""
Статлес-инструменты AI: генерация ответа по истории без хранения состояния.
Использует LangChain ChatAnthropic и инструменты.
"""
import logging
from datetime import date, datetime
from typing import List, Dict, Any, Optional
from zoneinfo import ZoneInfo

from langchain_anthropic import ChatAnthropic
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from config import settings
from business_types.base import BusinessType

logger = logging.getLogger(__name__)
TASHKENT_TZ = ZoneInfo("Asia/Tashkent")

# Глобальный LLM, без состояния диалога
_LLM: Optional[ChatAnthropic] = None


def _get_llm() -> ChatAnthropic:
    global _LLM
    if _LLM is None:
        _LLM = ChatAnthropic(
            model="claude-sonnet-4-5-20250929",
            anthropic_api_key=settings.anthropic_api_key,
            temperature=0.3,
            max_tokens=2000,
            model_kwargs={
                "extra_headers": {
                    "anthropic-beta": "prompt-caching-2024-07-31",
                }
            }
        )
    return _LLM


def _build_system_prompt(business_type: BusinessType, user_context: Dict[str, Any], user_info: Dict[str, Any], language: str) -> SystemMessage:
    language_name = {
        'ru': 'Russian',
        'uz': 'Uzbek',
        'en': 'English',
        'zh': 'Chinese'
    }.get(language, 'Russian')

    base_prompt = business_type.get_system_prompt_template()
    faq_content = business_type.load_faq()

    static_prompt = base_prompt.replace('{language}', language_name).replace('{faq_content}', faq_content)
    context_str = business_type.format_context_for_prompt(user_context)

    current_datetime = datetime.now(TASHKENT_TZ)
    current_datetime_str = current_datetime.strftime('%d.%m.%Y %H:%M')

    dynamic_prompt = f"""{'_'*48}

- **GUEST INFORMATION:**
  - Name: `{user_info.get('name', 'N/A')}`
  - Phone: `{user_info.get('phone', 'N/A')}`
  {context_str}
  - Current date/time: `{current_datetime_str}`

**Before answering make sure you follow all principles and limitations.**"""

    return SystemMessage(
        content=[
            {
                "type": "text",
                "text": static_prompt,
                "cache_control": {"type": "ephemeral"}
            },
            {
                "type": "text",
                "text": dynamic_prompt
            }
        ]
    )


def _create_tools(user_info: Dict[str, Any]) -> List[Any]:
    """Создаёт список инструментов, замыкаясь на user_info."""

    async def _create_request_async(type: str, message: str, checkin_date: date, date_str: str) -> str:
        try:
            # Сохраняем обращение через API
            from schemas import CustomerInquiryCreate, InquiryType, InquiryStatus, InquiryPriority
            from services.backend_api import BackendAPI

            # Определяем тип обращения
            inquiry_type_map = {
                "complaint": InquiryType.COMPLAINT,
                "suggestion": InquiryType.SUGGESTION,
                "question": InquiryType.QUESTION,
            }
            inquiry_type = inquiry_type_map.get(type, InquiryType.QUESTION)

            # Определяем приоритет (жалобы - высокий, остальное - средний)
            priority = InquiryPriority.HIGH if inquiry_type == InquiryType.COMPLAINT else InquiryPriority.MEDIUM

            # Находим customer_id по телефону через backend API
            customer_id = None
            try:
                # Используем новый endpoint для получения customer_id по telegram_id
                import uuid
                import httpx

                telegram_id = user_info.get('telegram_id')
                if telegram_id:
                    async with httpx.AsyncClient(
                        base_url=settings.backend_api_url,
                        timeout=15.0,
                        headers={"X-Telegram-Bot-Token": settings.telegram_token}
                    ) as client:
                        response = await client.get(f"/bot/users/{telegram_id}/customer")
                        if response.status_code == 200:
                            data = response.json()
                            if data.get('found') and data.get('customer_id'):
                                customer_id = uuid.UUID(data['customer_id'])
                                logger.info(f"Found customer_id {customer_id} for telegram_id {telegram_id}")
            except Exception as e:
                logger.warning(f"Не удалось получить customer_id: {e}")

            inquiry_data = CustomerInquiryCreate(
                bot_user_id=user_info.get('user_id'),
                customer_id=customer_id,
                inquiry_type=inquiry_type,
                message=message,
                status=InquiryStatus.NEW,
                priority=priority,
                inquiry_date=datetime.now(TASHKENT_TZ),
                related_booking_date=datetime.combine(checkin_date, datetime.min.time()) if checkin_date else None,
            )

            # Вызов API через сервис
            db_service = BackendAPI()
            ok = await db_service.create_inquiry(inquiry_data)
            if not ok:
                return "Не удалось зарегистрировать обращение. Пожалуйста, попробуйте позже."

            logger.info("Сохранено обращение через API")

            # Уведомления
            try:
                from bot.notifier import get_notifier
                notifier = get_notifier()

                if notifier:
                    request_data = {
                        "type": type,
                        "name": user_info.get('name', ''),
                        "surname": user_info.get('surname', ''),
                        "phone": user_info.get('phone', ''),
                        "birthdate": user_info.get('birthdate', ''),
                        "user_id": str(user_info.get('user_id', 'N/A')),
                        "telegram_username": user_info.get('telegram_username'),
                        "telegram_first_name": user_info.get('telegram_first_name'),
                        "telegram_last_name": user_info.get('telegram_last_name'),
                        "business_type": user_info.get('business_type', 'hotel'),
                        "checkin_date": date_str,
                        "room_id": "N/A",
                        "message": message,
                        "timestamp": datetime.now(TASHKENT_TZ).strftime('%d.%m.%Y %H:%M')
                    }

                    await notifier.notify_request_to_admin(request_data)

                    if user_info.get('telegram_id'):
                        try:
                            await notifier.notify_request_to_user(
                                user_info.get('telegram_id'),
                                request_data
                            )
                        except Exception as e:
                            logger.warning(f"Не удалось отправить демо-уведомление: {e}")
            except ImportError:
                logger.warning("Notifier недоступен")

        except Exception as e:
            logger.error(f"Ошибка при сохранении обращения через API: {e}")
            return f"Произошла ошибка при сохранении обращения: {str(e)}"

        return "Сообщение успешно зарегистрировано! Поблагодарите клиента за обращение и скажите, что руководство обязательно постараетя рассмотреть его как можно скорее и обязательно ответит."

    @tool
    async def create_request(type: str, message: str, date: str) -> str:
        """Создает обращение (жалоба/предложение). Дата в формате dd.mm.yyyy"""
        try:
            checkin_date = datetime.strptime(date, "%d.%m.%Y").date()
        except ValueError:
            return f"Ошибка: неверный формат даты {date}. Используйте формат dd.mm.yyyy"

        try:
            return await _create_request_async(
                type=type,
                message=message,
                checkin_date=checkin_date,
                date_str=date
            )
        except Exception as e:
            logger.error(f"Ошибка при создании обращения: {e}")
            return "Произошла ошибка при обработке вашего обращения. Пожалуйста, попробуйте позже."

    return [create_request]


async def generate_reply(
    business_type: BusinessType,
    user_context: Dict[str, Any],
    user_info: Dict[str, Any],
    language: str,
    history: List[Dict[str, str]]
) -> str:
    """Генерирует ответ для пользователя на основе истории без сохранения состояния.

    - business_type: объект типа бизнеса (для промпта, FAQ и форматирования контекста)
    - user_context: контекст пользователя для промпта
    - user_info: данные пользователя (включая 'phone', 'telegram_id' и т.д.)
    - language: код языка ответа
    - history: список {'role': 'user'|'assistant', 'content': str}
    """
    try:
        llm = _get_llm()
        tools = _create_tools(user_info)
        llm_with_tools = llm.bind_tools(tools)

        system_message = _build_system_prompt(business_type, user_context, user_info, language)
        messages: List[Any] = [system_message]

        for item in history:
            role = item.get('role')
            content = item.get('content', '')
            if not content:
                continue
            if role == 'user':
                messages.append(HumanMessage(content=content))
            elif role == 'assistant':
                messages.append(AIMessage(content=content))

        # Логируем то, что пойдёт в LLM (кроме system message)
        try:
            preview_lines: List[str] = ["LLM INPUT (excluding system message):"]
            for idx, msg in enumerate(messages[1:], start=1):
                role = (
                    "user" if isinstance(msg, HumanMessage)
                    else "assistant" if isinstance(msg, AIMessage)
                    else getattr(msg, "type", "unknown")
                )
                content = msg.content
                # Нормализуем мультимодальный/структурный контент в строку, если потребуется
                if isinstance(content, list):
                    try:
                        parts = []
                        for part in content:
                            if isinstance(part, dict) and "text" in part:
                                parts.append(str(part["text"]))
                            else:
                                parts.append(str(part))
                        content_str = "\n".join(parts)
                    except Exception:
                        content_str = str(content)
                else:
                    content_str = str(content)
                preview_lines.append(f"{idx:02d}. role={role}:\n{content_str}")
            logger.info("\n".join(preview_lines))
        except Exception as log_err:
            logger.warning(f"Не удалось вывести входные сообщения для LLM: {log_err}")

        response = await llm_with_tools.ainvoke(messages)

        if hasattr(response, 'tool_calls') and response.tool_calls:
            for tool_call in response.tool_calls:
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]

                for tool in tools:
                    if tool.name == tool_name:
                        try:
                            tool_result = await tool.ainvoke(tool_args)
                            from langchain_core.messages import ToolMessage
                            tool_message = ToolMessage(
                                content=str(tool_result),
                                tool_call_id=tool_call["id"]
                            )
                            messages.append(response)
                            messages.append(tool_message)

                            final_response = await llm_with_tools.ainvoke(messages)
                            return final_response.content
                        except Exception as e:
                            logger.error(f"Ошибка выполнения инструмента {tool_name}: {e}")
                            return f"Произошла ошибка при выполнении операции: {str(e)}"

        return response.content

    except Exception as e:
        logger.error(f"Ошибка при генерации ответа: {e}")
        return "Извините, произошла ошибка при обработке вашего сообщения. Попробуйте еще раз."
