# 🔥 ПОЛНЫЙ ПЛАН СИСТЕМНОГО РЕФАКТОРИНГА

## 📊 ТЕКУЩИЙ СТАТУС АНАЛИЗА

### ❌ КРИТИЧЕСКИЕ ПРОБЛЕМЫ (ЧАСТИЧНО ИСПРАВЛЕНЫ)

1. **HTTPException в Backend (≈30% исправлено)**
   - ✅ Исправлено: `services/booking.py`
   - ❌ НЕ исправлено:
     - `api/deps.py` (7+ мест) - авторизация
     - `api/routes/login.py` (2 места) - логин
     - `api/routes/utils.py` (1 место) - утилиты
     - `api/routes/bookings.py` (1 место) - букинги
     - `api/routes/files.py` (много мест) - файлы

2. **Generic Exception Handling (≈20% исправлено)**
   - ✅ Исправлено: `files.py` (частично)
   - ❌ НЕ исправлено:
     - `tests_pre_start.py` (1 место)
     - `backend_pre_start.py` (1 место)
     - `core/retry.py` (2 места)
     - `core/consistency.py` (4 места)

3. **React Key Props с Index (≈50% исправлено)**
   - ✅ Исправлено: частично в ConfirmModal, BookingDetailModal
   - ❌ Проблемные паттерны остались

4. **Unsafe Date Parsing (≈70% исправлено)**
   - ✅ Создана утилита safeParseDate
   - ✅ Исправлено 116+ мест
   - ⚠️ Нужна проверка всех компонентов

## 🎯 ПЛАН СИСТЕМНОГО РЕФАКТОРИНГА

### ФАЗА 1: Backend - Архитектурные нарушения

#### 1.1 HTTPException → Domain Exceptions
**Файлы для исправления:**

1. **`api/deps.py`** - Критично! Авторизация
   - Заменить все HTTPException на domain exceptions
   - Создать AuthenticationError, AuthorizationError

2. **`api/routes/login.py`** - Аутентификация
   - HTTPException → AuthenticationError

3. **`api/routes/utils.py`** - Утилиты
   - HTTPException → соответствующие domain exceptions

4. **`api/routes/bookings.py`** - Бизнес-логика
   - HTTPException → BusinessRuleViolation

5. **`api/routes/files.py`** - Файловые операции
   - Завершить замену всех HTTPException

#### 1.2 Generic Exception Handling
**Файлы для исправления:**

1. **`tests_pre_start.py`** - Тесты БД
   - `except Exception` → конкретные типы

2. **`backend_pre_start.py`** - Инициализация
   - `except Exception` → конкретные типы

3. **`core/retry.py`** - Retry механизм
   - 2 места с `except Exception`

4. **`core/consistency.py`** - Консистентность данных
   - 4 места с `except Exception`

### ФАЗА 2: Frontend - React и TypeScript

#### 2.1 React Key Props
**Стратегия:** Использовать уникальные идентификаторы вместо index

1. Найти ВСЕ использования `.map((item, index)` с `key={...index...}`
2. Заменить на стабильные идентификаторы

#### 2.2 Date Parsing Audit
**Стратегия:** Полный аудит всех new Date()

1. Grep все `new Date(` вызовы
2. Категоризировать:
   - Безопасные (без аргументов)
   - Небезопасные (с внешними данными)
3. Заменить небезопасные на safeParseDate

### ФАЗА 3: Дополнительные проверки

1. **Type Safety**
   - Найти все `as any`, `as unknown`
   - Найти все `// @ts-ignore`

2. **Error Boundaries**
   - Убедиться что все критические компоненты обернуты

3. **Env Variables**
   - Проверить все hardcoded значения

## 📋 ЧЕКЛИСТ ВЫПОЛНЕНИЯ

### Backend
- [ ] deps.py - все HTTPException заменены
- [ ] login.py - все HTTPException заменены
- [ ] utils.py - все HTTPException заменены
- [ ] bookings.py - все HTTPException заменены
- [ ] files.py - все HTTPException заменены
- [ ] tests_pre_start.py - конкретные exceptions
- [ ] backend_pre_start.py - конкретные exceptions
- [ ] retry.py - конкретные exceptions
- [ ] consistency.py - конкретные exceptions

### Frontend
- [ ] Все `.map` с index keys исправлены
- [ ] Все небезопасные new Date() заменены
- [ ] Нет `as any` assertions
- [ ] Нет `// @ts-ignore`

### Validation
- [ ] Backend запускается без ошибок
- [ ] Frontend компилируется без warnings
- [ ] Linters проходят (ruff, mypy, biome)
- [ ] API endpoints работают корректно

## 🚀 ПОРЯДОК ВЫПОЛНЕНИЯ

1. **Сначала Backend** - критические архитектурные проблемы
2. **Затем Frontend** - безопасность и стабильность
3. **Финальная валидация** - тесты и проверки

## ⏱️ ОЦЕНКА ВРЕМЕНИ

- Backend HTTPException: 30 минут
- Backend Exception handling: 20 минут
- Frontend Keys: 15 минут
- Frontend Dates: 15 минут
- Валидация: 10 минут

**TOTAL: ~90 минут**

## 🎯 КРИТЕРИИ УСПЕХА

1. **0 HTTPException** в services и business logic
2. **0 generic Exception** catches
3. **0 array index keys** в React
4. **0 unsafe date parsing** внешних данных
5. **Все linters проходят**
6. **Приложение работает корректно**