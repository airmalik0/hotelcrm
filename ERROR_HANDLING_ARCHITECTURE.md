# 🏛️ Архитектурный паттерн: Unified Error Handling

## Принцип и идея

Мы реализовали **единый контракт ошибок** между backend и frontend. Это архитектурный паттерн, где все ошибки приложения трансформируются в унифицированный формат на уровне API, что позволяет frontend обрабатывать их консистентно и предсказуемо.

## Ключевые компоненты

### 1. Backend: Централизованная трансформация ошибок

```python
# app/schemas/errors.py
class ValidationErrorDetail:
    field: str     # Поле с ошибкой
    message: str   # Понятное сообщение
    type: str      # Тип ошибки

class ValidationErrorResponse:
    detail: str = "Validation error"
    errors: list[ValidationErrorDetail]
    status_code: int = 422
```

**Зачем:** Единая структура позволяет автоматически преобразовывать любые ошибки (Pydantic, бизнес-логики, БД) в предсказуемый формат.

### 2. Exception Handlers на уровне приложения

```python
@app.exception_handler(RequestValidationError)  # Pydantic валидация
@app.exception_handler(ValueError)              # Бизнес-логика
@app.exception_handler(IntegrityError)         # Ошибки БД
```

**Зачем:** Перехватываем ошибки на самом высоком уровне, избавляя разработчиков от необходимости обрабатывать их в каждом endpoint.

### 3. Frontend: Типизированная обработка

```typescript
interface ValidationErrorDetail {
  field: string
  message: string
  type: string
}

// Type guard для проверки формата
function hasValidationErrors(data): data is APIErrorResponse {
  return 'errors' in data && Array.isArray(data.errors)
}
```

**Зачем:** TypeScript гарантирует, что мы правильно парсим ошибки и не пропустим важные детали.

## Архитектурные преимущества

### 1. Separation of Concerns
- **Routers:** Просто вызывают сервисы, не думая об ошибках
- **Services:** Бросают простые ValueError с понятными сообщениями
- **Exception Handlers:** Централизованно преобразуют в HTTP responses

### 2. DRY (Don't Repeat Yourself)

Вместо:
```python
# ❌ В каждом endpoint
try:
    service.create_customer(...)
except ValueError as e:
    raise HTTPException(400, str(e))
```

Получаем:
```python
# ✅ Просто вызываем
customer = service.create_customer(...)
```

### 3. Консистентность UX
- Все ошибки показываются через toast notifications
- Валидационные ошибки подсвечивают конкретные поля
- Пользователь всегда видит feedback на свои действия

### 4. Расширяемость
Добавить новый тип ошибки - это:
1. Добавить exception handler в `main.py`
2. Всё - frontend автоматически его обработает

## Контракт Frontend-Backend

```yaml
# Успех
200/201: { data }

# Валидация
422: {
  detail: "Validation error",
  errors: [{ field, message, type }]
}

# Бизнес-логика
400: {
  detail: "Business logic error",
  errors?: [{ field, message, type }]  # Опционально с полем
}

# Дубликаты
409: {
  detail: "Duplicate value error",
  errors: [{ field, message, type }]
}

# Простые ошибки
401/403/404/500: {
  detail: "Error message"
}
```

## Практические примеры

### Пример 1: Валидация Pydantic
```python
# Backend автоматически преобразует
POST /api/v1/customers/
{
  "phone": "123"  # Слишком короткий
}

# Response 422:
{
  "detail": "Validation error",
  "errors": [{
    "field": "body -> phone",
    "message": "Phone number must contain between 7 and 15 digits",
    "type": "value_error"
  }]
}
```

### Пример 2: Бизнес-логика
```python
# Service бросает ошибку
class CustomerService:
    def create_customer(self, customer_in):
        if self.crud.get_by_phone(phone):
            raise ValueError("phone: Phone number already registered")

# Response 400:
{
  "detail": "Business logic error",
  "errors": [{
    "field": "phone",
    "message": "Phone number already registered",
    "type": "business_error"
  }]
}
```

### Пример 3: Frontend обработка
```typescript
// Единая функция для всех форм
handleFormError(error, (errors) => {
  // errors = { phone: "Phone number already registered" }
  setErrors(errors)  // React state для подсветки полей
})

// Toast автоматически покажет сообщение
// Поле phone будет подсвечено красным
```

## Почему это важно?

1. **Maintainability:** Изменение формата ошибок в одном месте
2. **Developer Experience:** Разработчики не думают об обработке ошибок
3. **User Experience:** Консистентные и понятные сообщения
4. **Type Safety:** TypeScript защищает от ошибок парсинга
5. **Testability:** Легко тестировать централизованную логику

## Архитектурная диаграмма

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Service   │────▶│  Exception   │────▶│   Frontend  │
│             │     │   Handler    │     │             │
│ ValueError  │     │ Unification  │     │ TypeScript  │
│ "phone:..." │     │ → 400/422    │     │   Toast     │
└─────────────┘     └──────────────┘     └─────────────┘
       ↑                    ↑                    ↑
  Simple Error      Transform to HTTP     Type-safe parse
```

## Итог

Мы построили **трёхуровневую систему обработки ошибок**:

1. **Generation Level (Services):** Простые, понятные ошибки
2. **Transformation Level (Handlers):** Унификация в единый формат
3. **Presentation Level (Frontend):** Типизированная обработка и отображение

Это паттерн **Error Boundary на уровне архитектуры** - ошибки не протекают между слоями, а трансформируются в понятный контракт на границах системы.

## Преимущества для команды

- **Backend разработчик:** Просто бросает `ValueError`, не думает о HTTP
- **Frontend разработчик:** Всегда знает формат ошибок, TypeScript помогает
- **QA инженер:** Легко тестировать консистентность ошибок
- **Product Manager:** Пользователи всегда видят понятные сообщения
- **DevOps:** Централизованное логирование и мониторинг ошибок

## Следующие шаги

1. Добавить интеграцию с Sentry для мониторинга
2. Реализовать retry логику для сетевых ошибок
3. Добавить локализацию сообщений об ошибках
4. Создать визуальный style guide для отображения ошибок