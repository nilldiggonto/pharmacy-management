# Pharmacy Management Platform

Centralized pharmacy management platform built with FastAPI, PostgreSQL, Redis, and Next.js.

## Tech Stack

- **Backend**: FastAPI (Python 3.12 via pyenv), SQLAlchemy 2.0 (async), Alembic, PostgreSQL, Redis
- **Frontend**: Next.js 16+ (Node.js 24 via nvm)

## Initial Launch Scope (MVP)

1. Organization and multi-location setup (main office, central warehouse, pharmacy branches)
2. User accounts, role-based access control, and location-scoped permissions
3. Central product catalogue with unit packaging and pricing
4. Suppliers, purchase orders, and confirmed goods receiving (with partial deliveries)
5. Batch-level inventory, immutable stock movement ledger, FEFO selection, and expiry tracking
6. Stock transfers between locations (request, approval, in-transit dispatch, receipt confirmation)
7. Retail POS, payments, receipts, sales returns (to quarantine), voids, and daily branch cash closing
8. Owner dashboard, branch comparison, and essential stock/sales reports
9. Audit log for sensitive operations

## Project Structure

```text
.
├── backend/       # FastAPI application, migrations, and tests
└── frontend/      # Next.js web application (planned after backend completion)
```

## Getting Started

Setup instructions will be updated as each module is completed.
