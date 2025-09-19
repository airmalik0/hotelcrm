# 🏛️ Архитектурный паттерн: Domain-Driven Error Handling

## Принцип и идея

Мы реализовали **Domain-Driven Error Handling** - архитектурный паттерн, где каждая ошибка имеет семантическое значение и автоматически мапится на правильный HTTP статус. Это позволяет backend выражать бизнес-логику через типизированные исключения, а frontend получать предсказуемые ответы.

## Ключевые компоненты

### 1. Domain Exceptions: Семантические исключения

```python
# app/core/exceptions.py
class DomainError(Exception):
    """Базовый класс для всех доменных исключений"""

class NotFoundError(DomainError):
    """Ресурс не найден → HTTP 404"""
    def __init__(self, resource: str, identifier: str | None = None)

class AlreadyExistsError(DomainError):
    """Ресурс уже существует → HTTP 409"""
    def __init__(self, field: str, message: str)

class BusinessRuleViolation(DomainError):
    """Нарушение бизнес-правила → HTTP 400"""
    def __init__(self, message: str, field: str | None = None)
```

**Зачем:** Каждое исключение несёт смысловую нагрузку и автоматически определяет HTTP статус.

### 2. Автоматический маппинг на HTTP статусы

```python
# app/main.py
@app.exception_handler(NotFoundError)         # → 404
@app.exception_handler(AlreadyExistsError)    # → 409
@app.exception_handler(BusinessRuleViolation) # → 400
@app.exception_handler(IntegrityError)        # → 409
@app.exception_handler(RequestValidationError)# → 422
```

**Зачем:** Централизованная трансформация исключений в HTTP ответы, без дублирования кода.

### 3. Unified Response Format

```python
# Все ошибки имеют единый формат
{
    "detail": str,           # Общее описание ошибки
    "errors"?: [{           # Детали по полям (опционально)
        "field": str,
        "message": str,
        "type": str
    }]
}
```

**Зачем:** Frontend всегда знает структуру ошибки, независимо от её типа.

## Архитектурные преимущества

### 1. Semantic Exceptions vs Generic Errors

```python
# ❌ Старый подход - общий ValueError
if not customer:
    raise ValueError("Customer not found")  # Всегда 400

# ✅ Новый подход - семантические исключения
if not customer:
    raise NotFoundError("Customer", customer_id)  # Автоматически 404
```

### 2. Clean Services & Routes

```python
# Service - чистая бизнес-логика
class CustomerService:
    def create_customer(self, customer_in):
        if self.crud.get_by_phone(phone):
            raise AlreadyExistsError("phone", "Phone number already registered")
        return self.crud.create(customer_in)

# Route - никакой обработки ошибок!
@router.post("/customers/")
def create_customer(service: CustomerService, customer_in):
    return service.create_customer(customer_in)  # Всё!
```

### 3. Правильные HTTP статусы

| Исключение | HTTP Status | Семантика |
|------------|-------------|-----------|
| NotFoundError | 404 | Ресурс не существует |
| AlreadyExistsError | 409 | Конфликт - дубликат |
| BusinessRuleViolation | 400 | Нарушение бизнес-правила |
| RequestValidationError | 422 | Невалидные данные |
| IntegrityError | 409 | Нарушение целостности БД |

## Практические примеры

### Пример 1: Resource Not Found (404)
```python
# Service
def get_customer(self, customer_id):
    customer = self.crud.get(customer_id)
    if not customer:
        raise NotFoundError("Customer", customer_id)

# HTTP Response
404 Not Found
{
    "detail": "Customer with id 123e4567-e89b-12d3 not found"
}
```

### Пример 2: Duplicate Resource (409)
```python
# Service
def create_customer(self, customer_in):
    if self.crud.get_by_phone(customer_in.phone):
        raise AlreadyExistsError("phone", "Phone number already registered")

# HTTP Response
409 Conflict
{
    "detail": "Resource already exists",
    "errors": [{
        "field": "phone",
        "message": "Phone number already registered",
        "type": "already_exists"
    }]
}
```

### Пример 3: Business Rule Violation (400)
```python
# Service
def delete_customer(self, customer_id):
    booking_count = crud_booking.count_filtered(customer_id=customer_id)
    if booking_count > 0:
        raise BusinessRuleViolation(f"Cannot delete customer with {booking_count} bookings")

# HTTP Response
400 Bad Request
{
    "detail": "Cannot delete customer with 3 bookings"
}
```

### Пример 4: Complex Business Rule with Field
```python
# Service
def update_password(self, user, password_update):
    if not verify_password(password_update.current_password, user.hashed_password):
        raise BusinessRuleViolation("Incorrect password", field="password")

# HTTP Response
400 Bad Request
{
    "detail": "Business rule violation",
    "errors": [{
        "field": "password",
        "message": "Incorrect password",
        "type": "business_error"
    }]
}
```

## Frontend Integration

```typescript
// Axios interceptor автоматически обрабатывает все ошибки
axios.interceptors.response.use(
    response => response,
    error => {
        const status = error.response?.status
        const data = error.response?.data

        switch(status) {
            case 404:
                toast.error(data.detail)  // "Customer not found"
                break
            case 409:
                if (data.errors) {
                    // Подсветить конкретное поле
                    setFieldError(data.errors[0].field, data.errors[0].message)
                }
                break
            case 400:
                // Бизнес-правило нарушено
                handleBusinessError(data)
                break
        }
    }
)
```

## Архитектурная диаграмма

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Services     │────▶│ Domain Exceptions│────▶│ HTTP Handlers   │
│                 │     │                  │     │                 │
│ Business Logic  │     │ NotFoundError    │     │ → 404 Not Found │
│ Throws specific │     │ AlreadyExists    │     │ → 409 Conflict  │
│   exceptions    │     │ BusinessRule     │     │ → 400 Bad Req   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         ↓                       ↓                        ↓
   Clean code            Semantic meaning          Correct HTTP
```

## Преимущества паттерна

### 1. **Separation of Concerns**
- Services: Только бизнес-логика
- Exceptions: Семантика ошибок
- Handlers: HTTP трансформация

### 2. **Type Safety**
```python
# Невозможно забыть обработать ошибку
# Exception handlers перехватят всё автоматически
```

### 3. **Maintainability**
```python
# Добавить новый тип ошибки:
class AuthorizationError(DomainError):
    """Недостаточно прав → HTTP 403"""

# Добавить handler:
@app.exception_handler(AuthorizationError)
async def auth_error_handler(request, exc):
    return JSONResponse(status_code=403, content={"detail": str(exc)})

# Всё! Можно использовать во всех сервисах
```

### 4. **Testing**
```python
def test_customer_not_found():
    with pytest.raises(NotFoundError) as exc:
        service.get_customer("non-existent-id")
    assert "Customer" in str(exc.value)
```

## Сравнение подходов

| Аспект | Старый (ValueError) | Новый (Domain Exceptions) |
|--------|-------------------|------------------------|
| HTTP статусы | Всегда 400 | Семантически корректные |
| Читаемость | `ValueError("msg")` | `NotFoundError("Customer", id)` |
| Обработка в routes | try/except везде | Автоматическая |
| Тестирование | Проверка строк | Проверка типов |
| Расширяемость | Изменение везде | Добавление handler |

## Service Helper Methods Pattern

Для консистентности и DRY принципа, все сервисы должны предоставлять helper методы:

```python
class CustomerService:
    def get_customer_or_404(self, customer_id: uuid.UUID) -> Customer:
        """Get customer by ID or raise NotFoundError."""
        customer = self.crud.get(self.session, id=customer_id)
        if not customer:
            raise NotFoundError("Customer", str(customer_id))
        return customer

    def get_customer_for_delete(self, customer_id: uuid.UUID) -> Customer:
        """Get customer and validate business rules for deletion."""
        customer = self.get_customer_or_404(customer_id)

        # Business rule validation
        booking_count = crud_booking.count_filtered(self.session, customer_id=customer_id)
        if booking_count > 0:
            raise BusinessRuleViolation(f"Cannot delete customer with {booking_count} bookings")

        return customer
```

**Преимущества:**
- **DRY**: Убирает дублирование get+check паттерна
- **Consistency**: Все single entity operations используют одинаковый подход
- **Business Logic**: Валидация централизована в сервисах
- **Predictable**: LLM всегда знает какой метод использовать

## Best Practices

1. **Используйте правильное исключение для контекста:**
   - Ресурс не найден → `NotFoundError`
   - Дубликат → `AlreadyExistsError`
   - Бизнес-правило → `BusinessRuleViolation`

2. **Включайте контекст в исключения:**
   ```python
   # ✅ Хорошо
   raise NotFoundError("Customer", customer_id)

   # ❌ Плохо
   raise NotFoundError("Not found")
   ```

3. **Указывайте поле для валидационных ошибок:**
   ```python
   raise AlreadyExistsError("email", "Email already registered")
   ```

4. **Не обрабатывайте исключения в routes:**
   ```python
   # ✅ Правильно
   return service.create_customer(customer_in)

   # ❌ Неправильно
   try:
       return service.create_customer(customer_in)
   except AlreadyExistsError as e:
       raise HTTPException(409, str(e))
   ```

## Мониторинг и отладка

Все исключения автоматически логируются и отправляются в Sentry:

```python
# Sentry автоматически группирует по типам
NotFoundError → Ignored (expected)
AlreadyExistsError → Warning (дубликаты)
BusinessRuleViolation → Info (бизнес-логика)
Exception → Error (unexpected)
```

## Итог

Мы построили **Domain-Driven Error System**, где:

1. **Исключения выражают бизнес-смысл**, а не технические детали
2. **HTTP статусы определяются автоматически** по типу исключения
3. **Routes остаются чистыми** без try/except блоков
4. **Frontend получает предсказуемые ответы** с правильными статусами

Это делает код более **читаемым, тестируемым и поддерживаемым**.

## Checklist внедрения

- [x] Создать domain exceptions (`app/core/exceptions.py`)
- [x] Добавить exception handlers в `main.py`
- [x] Обновить все сервисы на использование domain exceptions
- [x] Удалить try/except из routes
- [x] Создать service helper methods (`get_X_or_404` pattern)
- [x] Рефакторить все single entity operations → service helpers
- [x] Убрать HTTPException(40X) из business domain routes
- [x] Проверить архитектурную consistency
- [x] Протестировать все сценарии ошибок
- [x] Обновить документацию (CLAUDE.md + ERROR_HANDLING_ARCHITECTURE.md)
- [ ] Настроить фильтры в Sentry
- [ ] Добавить метрики по типам ошибок

**Текущий статус**: ✅ **ЗАВЕРШЕНО** - Domain-Driven Error Handling полностью внедрен