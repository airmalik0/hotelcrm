FROM python:3.11-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Создание рабочей директории
WORKDIR /app

# Установка UV (менеджер пакетов)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Копирование файлов зависимостей
COPY requirements.txt .

# Установка Python зависимостей через uv
RUN uv pip install --system --no-cache -r requirements.txt

# Копирование кода приложения
COPY . .

# Создание директории для логов и alembic версий
RUN mkdir -p logs alembic/versions

# Запуск бота через uv
CMD ["uv", "run", "python", "main.py"]