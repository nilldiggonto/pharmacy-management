# Pharmacy Management Platform

Centralized pharmacy management platform built with FastAPI, PostgreSQL, Redis, and Next.js.

## Tech Stack

- **Backend**: FastAPI (Python 3.12 via pyenv), SQLAlchemy 2.0 (async + asyncpg), Alembic, PostgreSQL, Redis
- **Frontend**: Next.js 16+ (Node.js 24 via nvm) [next phase]

## Initial Launch Scope (MVP)

1. Organization and multi-location setup (main office, central warehouse, 7 pharmacy branches)
2. User accounts, role-based access control, and location-scoped permissions
3. Central product catalogue with unit packaging and pricing
4. Suppliers, purchase orders, and confirmed goods receiving (with partial deliveries)
5. Batch-level inventory, immutable stock movement ledger, FEFO selection, and expiry tracking
6. Stock transfers between locations (request, approval, in-transit dispatch, receipt confirmation)
7. Retail POS, payments, receipts, sales returns (routed to quarantine), manager-controlled voids, and daily branch cash closing
8. Owner dashboard, branch comparison, low-stock and expiry reports
9. Immutable audit log for sensitive operations

## Project Structure

```text
.
├── backend/       # FastAPI application, Alembic migrations, seed script, and pytest suite
└── frontend/      # Next.js web application (upcoming)
```

## Local Setup & Run

### Backend (FastAPI)

Ensure local PostgreSQL and Redis services are running, then from `backend/`:

1. Copy environment file and set your local `DATABASE_URL` and `REDIS_URL`:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies with `uv` (using Python 3.12):
   ```bash
   uv venv --python 3.12
   uv pip install -e ".[dev]"
   ```
3. Run database migrations and seed initial locations (1 main office, 1 central warehouse, 7 branches) and owner account (`owner@pharmacy.com` / `OwnerPass123!`):
   ```bash
   uv run alembic revision --autogenerate -m "initial schema"
   uv run alembic upgrade head
   uv run python -m app.seed
   ```
4. Start the FastAPI dev server:
   ```bash
   uv run uvicorn app.main:app --reload --port 8000
   ```
   OpenAPI docs are available at `http://localhost:8000/docs`.

### Frontend (Next.js)

From `frontend/` (using Node 24 via `nvm`):

```bash
nvm use 24
npm install
npm run dev
```

## Running Backend Tests

```bash
cd backend && uv run pytest tests
```
