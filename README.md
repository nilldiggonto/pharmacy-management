# MedGrid Pharmacy & Wholesale Management Platform

Centralized pharmacy inventory, wholesale distribution, and multi-branch retail POS platform built with FastAPI, PostgreSQL, Redis, Next.js, and Three.js.
<img width="1901" height="696" alt="image" src="https://github.com/user-attachments/assets/02932f3a-c33c-4fb1-95c4-e1f7de45cf3b" />

<img width="1893" height="945" alt="image" src="https://github.com/user-attachments/assets/a0d47034-770f-4523-82bb-228867520c25" />

## Tech Stack

- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 (async + asyncpg), Alembic, Pydantic v2, PostgreSQL, Redis, Server-Sent Events (SSE)
- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4), shadcn/ui + Radix primitives, Phosphor Icons, Motion, Three.js

## Core Capabilities

1. **Multi-Location Dhaka Network**: Head Office (`HQ-01`), **Uttara Main Hub & Wholesale Depot (`WH-01`)**, and 7 Dhaka retail branches (`BR-01` Uttara Flagship, `BR-02` Mirpur 10, `BR-03` Bashundhara R/A, `BR-04` Gulshan 2, `BR-05` Banani Rd 11, `BR-06` Dhanmondi 27, `BR-07` Motijheel).
2. **Strict Role-Based & Branch-Scoped Access (9 Staff Roles)**:
   - Branch staff (Branch Manager, Pharmacist, Cashier) can view network-wide stock availability across all locations but can only perform operational actions on their assigned branch(es).
   - Stock Data Entry Operator (`stock_entry_operator`) manages Uttara Main Hub stock intake, batch edits, product catalogue entries, and supplier goods receiving.
3. **3D Bangladesh & Dhaka Live Operations Map**:
   - High-resolution extruded 3D Bangladesh relief map with major rivers (Jamuna, Padma, Meghna), elevated Dhaka Metro plateau, architectural hub/branch landmarks, and division view switcher.
   - Live 3D cold-chain delivery vans animate only on active dispatched shipments, with inline Approve, Dispatch, and Confirm Received controls directly on the map panel.
4. **Real-Time Staff Sync (SSE)**:
   - `GET /api/v1/events/stream` pushes instant notifications and auto-refreshes live inventory across all connected staff sessions when sales, restocks, transfers, or goods receipts occur.
5. **Network Stock Finder & FEFO Batch Inventory**:
   - Cross-branch medicine lookup (`GET /api/v1/inventory/availability`) with 1-click restock requests from Uttara Main Hub.
   - Direct stock-in (`POST /api/v1/inventory/stock-in`), batch editing (`PATCH /api/v1/inventory/batches/{id}`), quarantine/expiry controls, stock adjustments with separation-of-duties approval, and an immutable stock movement ledger.
6. **Wholesale B2B & Retail POS**:
   - Branch retail POS with atomic FEFO stock deduction and blocked expired batches.
   - Uttara Main Hub wholesale B2B dispatch using wholesale pricing tiers.
   - Manager-controlled invoice voids (restoring stock), customer returns (routed to `quarantined` status), and daily branch register closing with discrepancy tracking.
7. **Supplier Purchasing & Goods Receiving**:
   - Purchase order creation, Head Office approval, and verified Goods Receipt (GRN) with batch numbers, expiry dates, damaged-unit separation, and supplier balance tracking.
8. **Public Storefront (`/`, `/shop`, `/branches`)**:
   - Interactive 3D hero capsule scene, OTC medicine shop with household order limits and Rx safeguards, and interactive 3D Dhaka branch locator.

## Seeded Staff Accounts

Run `python -m app.seed` to load Uttara Main Hub, 7 Dhaka branches, 4 pharmaceutical suppliers, 12 medicines/supplies, realistic batches (including shortages, near-expiry, expired, and quarantined), purchase orders, transfers, sales, and all 9 staff accounts:

| Role | Email | Password | Scope |
| --- | --- | --- | --- |
| Owner | `owner@pharmacy.com` | `OwnerPass123!` | All locations |
| Head Office Manager | `manager@pharmacy.com` | `StaffPass123!` | All locations |
| Branch Manager | `branch.manager@pharmacy.com` | `StaffPass123!` | Assigned branches (`BR-01`, `BR-02`) |
| Pharmacist | `pharmacist@pharmacy.com` | `StaffPass123!` | Assigned branches (`BR-01`, `BR-02`) |
| Cashier | `cashier@pharmacy.com` | `StaffPass123!` | Assigned branches (`BR-01`, `BR-02`) |
| Inventory Officer | `inventory@pharmacy.com` | `StaffPass123!` | All locations (`WH-01` primary) |
| Stock Data Entry | `data.entry@pharmacy.com` | `StaffPass123!` | Uttara Main Hub (`WH-01`) |
| Procurement Officer | `procurement@pharmacy.com` | `StaffPass123!` | All locations |
| Accountant | `accountant@pharmacy.com` | `StaffPass123!` | All locations |

## Project Structure

```text
.
├── backend/       # FastAPI application, Alembic migrations, seed script, and pytest suite
└── frontend/      # Next.js 16 public storefront and creamy-white & crimson admin portal
```

## Local Setup & Run

### Backend (FastAPI)

Ensure local PostgreSQL and Redis services are running, then from `backend/`:

1. Copy environment file and verify `DATABASE_URL`, `REDIS_URL`, and `CORS_ORIGINS`:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies with `uv` (Python 3.12):
   ```bash
   uv venv --python 3.12
   uv pip install -e ".[dev]"
   ```
3. Run database migrations and seed data:
   ```bash
   uv run alembic upgrade head
   uv run python -m app.seed
   ```
4. Start the FastAPI server:
   ```bash
   uv run uvicorn app.main:app --reload --port 8000
   ```
   OpenAPI docs are available at `http://localhost:8000/docs`.

### Frontend (Next.js)

From `frontend/` (Node.js 24 via `nvm`):

```bash
nvm use 24
npm install
npm run dev
```

Visit `http://localhost:3000` (or `http://localhost:3001` if port 3000 is in use) and sign in at `/login`.

## Running Checks & Tests

```bash
# Backend pytest suite
cd backend && uv run pytest tests

# Frontend TypeScript check
cd frontend && npx tsc --noEmit
```
