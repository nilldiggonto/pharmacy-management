# Pharmacy Management Platform

Centralized pharmacy management platform built with FastAPI, PostgreSQL, Redis, and Next.js.

## Tech Stack

- **Backend**: FastAPI (Python 3.12 via pyenv), SQLAlchemy 2.0 (async + asyncpg), Alembic, PostgreSQL 16, Redis 7
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
├── docker-compose.yml   # Local PostgreSQL 16 and Redis 7
├── backend/             # FastAPI application, Alembic migrations, seed script, and pytest suite
└── frontend/            # Next.js web application (upcoming)
```

## Backend Setup & Run

1. Start PostgreSQL and Redis:
   ```bash
   docker compose up -d
   ```
2. Configure environment:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Activate Python 3.12 virtual environment and install dependencies:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -e ".[dev]"
   ```
4. Create database tables via Alembic (or generate initial migration against PostgreSQL):
   ```bash
   alembic revision --autogenerate -m "initial schema"
   alembic upgrade head
   ```
5. Seed initial locations (1 main office, 1 central warehouse, 7 branches) and owner account (`owner@pharmacy.com` / `OwnerPass123!`):
   ```bash
   python -m app.seed
   ```
6. Run the API server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   OpenAPI docs are available at `http://localhost:8000/docs`.

## Running Backend Tests

```bash
backend/.venv/bin/pytest backend/tests
```
