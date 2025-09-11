# Hotel CRM

## Structure
backend/    FastAPI (Python/uv)
frontend/   React 18 + Tailwind CSS (WowDash HTML templates as reference)
docker-compose.yml

## Commands
```bash
# Full stack
docker compose up

# Backend only
cd backend && uv run fastapi dev app/main.py

# Frontend only
cd frontend && npm run dev
```

Admin: admin
Password: See .env

## Critical Rules

1. NEVER use python or pip - ALWAYS use uv run
2. ALWAYS reference WowDash HTML templates for UI patterns
3. Context docs auto-load: frontend/CLAUDE.md and backend/CLAUDE.md
4. Linters run every 3rd edit (ruff/mypy for backend, biome for frontend)
5. API client regenerates when models.py changes
6. ALWAYS commit after completing features
7. After new backend features: ask "Should I add tests?"

## Automation Hooks
Linters: Every 3rd file edit
Schema: Auto-regenerates on models.py change
Context: Loads backend/frontend docs automatically
These hooks provide feedback but won't block your work - you can fix issues when convenient.

## Stack
Backend: FastAPI, PostgreSQL, SQLModel, uv
Frontend: React 18.3, Tailwind CSS, TanStack Query v5, React Router v6 (WowDash HTML templates as UI reference)
Auth: JWT
Tests: pytest

## Environment
.env - Backend config
frontend/.env - Frontend config (VITE_*)

## Testing & Linting
```bash
cd backend && uv run python -m pytest
cd backend && uv run ruff check .
cd backend && uv run python -m mypy .
cd frontend && npm run lint
./scripts/generate-client.sh  # Manual API client regeneration
# Flow: models.py → OpenAPI JSON → @hey-api/openapi-ts → src/client/
# Setup: setupApiClient() in App.tsx configures BASE, TOKEN, interceptors
```

## Database
Port: localhost:5432
Credentials: See .env
Direct: psql -h localhost -U postgres -d app
Containers: hotelcrm-backend-1, hotelcrm-db-1

## Git
```bash
git add .
git commit -m "feat: description"
git push origin main
```

## GitHub Repository
This project is connected to: git@github.com:airmalik0/hotelcrm.git

## Error Monitoring
This project uses Sentry for error monitoring in production.

## Traefik Configuration
- **Email for SSL**: maik.yuldashev2004@gmail.com
- **Dashboard Username**: admin
- **Dashboard URL**: https://traefik.hotelcrm.pro
- Dashboard password is the same as first superuser password

## Production
See DEPLOYMENT.md
WARNING: Never use docker compose up in production

## Best Practices
- Use stable React 18.3 and React Router v6
- Use RouterProvider with createBrowserRouter pattern
- Handle OAuth2 with URLSearchParams directly
- Configure axios interceptors on instance.defaults