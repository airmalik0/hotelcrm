# План аудита стилей существующих компонентов

## 🎯 Цель
Проверить все УЖЕ СОЗДАННЫЕ компоненты против их HTML референсов из WowDash и убедиться, что мы правильно конвертировали кастомные SCSS классы в Tailwind утилиты.

## 📋 Компоненты для аудита

### 1. ✅ CustomerProfile (`/src/pages/CustomerProfile.tsx`)
**HTML референс:** `wowdash-templates-tailwand/pages/view-profile.html`
**Статус:** ИСПРАВЛЕНО
- Карточка профиля: изменено с `dark:bg-neutral-700` на `dark:bg-neutral-700` (но должно быть `dark:bg-dark-2`)
- Форма редактирования: исправлено на `bg-white dark:bg-transparent`

### 2. ✅ CustomerEditForm (`/src/components/customer/CustomerEditForm.tsx`)
**HTML референс:** часть `view-profile.html` (вкладка Edit Profile)
**Статус:** ИСПРАВЛЕНО
- Все инпуты: изменено на `border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5`

### 3. ✅ CustomerCreateModal (`/src/components/customer/CustomerCreateModal.tsx`)
**HTML референс:** `wowdash-templates-tailwand/pages/add-user.html`
**Статус:** ИСПРАВЛЕНО
- Форма: использует правильные паттерны из form.scss

### 4. ❌ CustomerList (`/src/pages/CustomerList.tsx`)
**HTML референс:** `wowdash-templates-tailwand/pages/users-list.html`
**Что проверить:**
```html
<!-- В референсе line 16: -->
<div class="card h-full p-0 rounded-xl border-0 overflow-hidden">

<!-- В референсе line 51: -->
<table class="table bordered-table sm-table mb-0">
```
**SCSS файлы для проверки:**
- `assets/scss/components/_card.scss` - для `.card`
- `assets/scss/components/_table.scss` - для `.table`, `.bordered-table`
**Текущие проблемы:**
- Возможно использует неправильные классы для карточки
- Таблица может не соответствовать стилям из table.scss

### 5. ❌ Login (`/src/pages/Login.tsx`)
**HTML референс:** `wowdash-templates-tailwand/pages/sign-in.html`
**Что проверить:**
```html
<!-- В референсе line 95-96: -->
<input type="email" class="form-control rounded-lg" id="email" placeholder="Enter Email Address">

<!-- В референсе line 113: -->
<button type="submit" class="btn btn-primary text-sm px-8 py-4 w-full rounded-lg">Sign In</button>
```
**SCSS файлы для проверки:**
- `assets/scss/components/_form.scss` - для `.form-control`
- `assets/scss/components/_button.scss` - для `.btn`, `.btn-primary`
**Текущие проблемы:**
- Инпуты могут использовать неправильные классы
- Кнопка может не соответствовать btn-primary паттерну

### 6. ❌ MainLayout (`/src/layouts/MainLayout.tsx`)
**HTML референсы:**
- `wowdash-templates-tailwand/layouts/_sidebar.html`
- `wowdash-templates-tailwand/layouts/_nav.html`
**Что проверить:**
```html
<!-- sidebar.html line 3: -->
<aside class="sidebar">

<!-- nav.html line 2: -->
<div class="navbar-header">
```
**SCSS файлы для проверки:**
- `assets/scss/components/_sidebar.scss`
- `assets/scss/components/_navbar.scss`
**Текущие проблемы:**
- Сайдбар и навбар могут использовать неправильные цвета фона
- Hover эффекты могут отличаться

### 7. ❌ Dashboard компоненты (Admin/Manager/Host)
**HTML референс:** `wowdash-templates-tailwand/pages/index.html`
**Что проверить:**
```html
<!-- index.html line 16: -->
<div class="card">
  <div class="card-body">
```
**SCSS файлы для проверки:**
- `assets/scss/components/_card.scss`
**Текущие проблемы:**
- Карточки могут использовать `dark:bg-neutral-700` вместо `dark:bg-dark-2`

### 8. ❌ KPICard (`/src/components/dashboard/KPICard.tsx`)
**HTML референс:** метрические карточки из `index.html`
**SCSS файлы для проверки:**
- `assets/scss/components/_card.scss`
**Текущие проблемы:**
- Проверить соответствие паддингов и цветов

### 9. ❌ AuthLayout (`/src/layouts/AuthLayout.tsx`)
**HTML референс:** структура из `sign-in.html`
**Текущие проблемы:**
- Проверить фоновые градиенты и центрирование

## 🔍 Что нужно проверить в каждом SCSS файле

### `_form.scss`:
```scss
.form-control {
  @apply border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full;
}
```
**Наши компоненты должны использовать:** `border border-neutral-300 dark:border-neutral-500 rounded-lg bg-white dark:bg-transparent px-5 py-2.5 w-full`

### `_card.scss`:
```scss
.card {
  @apply bg-white dark:bg-dark-2 rounded-lg border border-neutral-600;
}
.card-body {
  @apply px-6 py-5;
}
```
**Наши компоненты должны использовать:** 
- Карточка: `bg-white dark:bg-dark-2 rounded-lg border border-neutral-600`
- Тело карточки: `px-6 py-5`

### `_button.scss`:
```scss
.btn {
  @apply rounded-lg py-3 px-6 inline-flex transition;
}
.btn-primary-600 {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}
```
**Наши компоненты должны использовать:** `rounded-lg py-3 px-6 inline-flex transition bg-primary-600 text-white hover:bg-primary-700`

### `_table.scss`:
Нужно найти и проверить определения для:
- `.table`
- `.bordered-table`
- `.sm-table`

## 📝 Чек-лист для каждого компонента

1. **Открыть наш компонент и HTML референс рядом**
2. **Найти все кастомные классы в HTML** (`.form-control`, `.card`, `.btn`, etc.)
3. **Проверить SCSS файл** для каждого кастомного класса
4. **Сравнить наши Tailwind классы** с @apply директивами из SCSS
5. **Исправить несоответствия**

## 🔧 Уже найденные проблемы для исправления

### Общие паттерны:
- ❌ `bg-neutral-50` → ✅ `bg-white` (для светлой темы форм)
- ❌ `dark:bg-neutral-700` → ✅ `dark:bg-transparent` (для форм в темной теме)
- ❌ `dark:bg-neutral-700` → ✅ `dark:bg-dark-2` (для карточек в темной теме)
- ❌ `px-4 py-2.5` → ✅ `px-5 py-2.5` (для форм)
- ❌ `border-neutral-300` → ✅ `border border-neutral-300` (нужен префикс border)

## 🚀 Порядок выполнения

1. **Сначала проверить все SCSS файлы** и составить полный список паттернов
2. **Login страница** - первое что видит пользователь
3. **CustomerList** - основная страница после входа
4. **MainLayout** - влияет на весь интерфейс
5. **Dashboard компоненты** - главные страницы
6. **Остальные компоненты**

## 📊 Прогресс

| Компонент | HTML референс | SCSS проверен | Стили исправлены |
|-----------|--------------|---------------|------------------|
| CustomerProfile | view-profile.html | ✅ | ✅ |
| CustomerEditForm | view-profile.html | ✅ | ✅ |
| CustomerCreateModal | add-user.html | ✅ | ✅ |
| CustomerList | users-list.html | ❌ | ❌ |
| Login | sign-in.html | ❌ | ❌ |
| MainLayout | sidebar.html, nav.html | ❌ | ❌ |
| Dashboards | index.html | ❌ | ❌ |
| KPICard | index.html | ❌ | ❌ |
| AuthLayout | sign-in.html | ❌ | ❌ |

## ⚠️ Важные замечания

1. **НЕ копировать классы напрямую из HTML** - всегда проверять их определения в SCSS
2. **dark-2 = #273142** - специальный цвет для карточек в темной теме (НЕ neutral-700!)
3. **Всегда включать все dark: варианты** из референсов
4. **Проверять в обеих темах** после исправления