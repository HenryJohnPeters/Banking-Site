# Banking Platform

Backend: NestJS 11, PostgreSQL, Drizzle ORM, JWT  
Frontend: React 19, TypeScript, Tailwind, Vite

---

## 1. Setup Instructions

### Backend

1. Install deps and start Postgres in Docker:
   - `cd backend`
   - `npm install`
   - `npm run db:up`
2. Configure env (example):
   - `export DATABASE_URL="postgres://postgres:postgres@localhost:5432/banking"`
3. Run migrations and seed demo data:
   - `npm run db:migrate`
   - `npm run db:setup`
4. Start API:
   - `npm run start:dev` (default: `http://localhost:3001/api`)
   - API Documentation (Swagger): `http://localhost:3001/api/docs`

Database tooling (from `backend/`):

- `npm run db:up` / `npm run db:down` – start/stop Postgres
- `npm run db:migrate` – apply migrations
- `npm run db:migrate:generate` – generate new migration from `scripts/schema.ts`
- `npm run db:migrate:push` – push schema directly (development only)
- `npm run db:setup` – seed demo user and accounts

### Frontend

1. Install deps:
   - `cd frontend`
   - `npm install`
2. Start dev server:
   - `npm run dev` (default: `http://localhost:5174`)

By default the frontend talks to `http://localhost:3001/api` (see `src/api/client.ts`).

### Test Users

Seed script creates a demo user (for quick testing):

| Email             | Password    |
| ----------------- | ----------- |
| alice@example.com | password123 |

You can also register new users via the API or UI.

---

## 2. User Management Approach

**Chosen:** Registration + pre-seeded users

- `POST /api/auth/register` – users can self-register.
- `npm run db:setup` – seeds a demo user and their USD/EUR accounts.
- Each user has:
  - 1 USD account (initial: 1000.00)
  - 1 EUR account (initial: 500.00)

Authentication: JWT access token, validated by NestJS `JwtAuthGuard`.

---

## 3. Core API Endpoints (Summary)

All routes are under `/api`.

**Auth**

- `POST /auth/login`
- `POST /auth/register`
- `GET  /auth/profile` ("me")
- `POST /auth/logout`

**Accounts**

- `GET /accounts` – list current user accounts + balances
- `GET /accounts/:id` – account detail
- `GET /accounts/:id/balance` – current balance

**Transactions**

- `POST /transactions/transfer` – same-currency transfer between accounts/users
- `POST /transactions/exchange` – FX within user (USD↔EUR)
- `GET  /transactions` – history with `page`, `limit`, `type`
- `GET  /transactions/exchange-rates` – fixed FX rates
- `GET  /transactions/verify-integrity` – ledger/balance consistency check

---

## 4. Double-Entry Ledger Design

Tables (see `backend/scripts/schema.ts`):

- `users`

  - Basic user info + credentials.

- `accounts`

  - `id`, `user_id`, `currency (USD|EUR)`, `balance numeric(18,2)`
  - `balance` is a cached value derived from `ledger_entries` for performance.

- `transactions`

  - High-level, user-facing record.
  - Fields: `id`, `from_account_id?`, `to_account_id`, `amount`, `currency`, `type`, `status`, `description`, `idempotency_key`.
  - One row per logical operation (transfer or exchange).

- `ledger_entries`
  - Authoritative audit trail.
  - Fields: `id`, `transaction_id`, `account_id`, `amount`, `type`, `created_at`.
  - **Double-entry rule:** for each `transaction_id`, the sum of `amount` over all its `ledger_entries` must be ~0.

Implementation details:

- `LedgerService.createLedgerEntries` rejects any batch where `Σ amount` is not ~0 (±0.01).
- `TransactionsService` always writes **two** `ledger_entries` records per transaction:
  - Transfer:
    - Debit source account: `-amount`.
    - Credit destination account: `+amount`.
  - Exchange:
    - Debit source currency: `-from_amount`.
    - Credit target currency: `+to_amount` (FX-converted and rounded).
- The `ledger_entries` table is the single source of truth; `accounts.balance` is updated from it.

---

## 5. Balance Consistency Strategy

Goal: keep `accounts.balance` fast to query but always reconcilable with the `ledger_entries` table.

- On each transaction (`transfer` / `exchange`):

  1. Begin a DB transaction.
  2. Insert the `transactions` row.
  3. Insert balanced `ledger_entries`.
  4. For each affected account:
     - Recalculate balance as `SUM(amount)` from `ledger_entries`.
     - `UPDATE accounts SET balance = computed_balance`.
  5. Commit.

- All of the above happens using the same `PoolClient` and transaction, so it is **atomic**.
- `LedgerService.verifyAllAccountBalances` and `verifyLedgerIntegrity` can be used to:
  - Globally check that `accounts.balance` matches `ledger_entries` sums.
  - Detect any unbalanced `transaction_id` groups.

---

## 6. Design Decisions & Trade-Offs

- **Postgres + numeric(18,2)** for money:
  - Avoids floating-point errors, keeps two-decimal precision.
- **Double-entry ledger** instead of direct balance mutations:
  - Guarantees a full audit trail and easy reconciliation.
- **Idempotency keys** per transaction:
  - Prevent duplicate processing on retries.
- **Row-level locking** on `accounts`:
  - Prevents race conditions and double-spends.
- **Balance cache on `accounts`**:
  - Fast reads for UI; re-derived from the `ledger_entries` table after each transaction.
- **Fixed FX rate in code (1 USD = 0.92 EUR)**:
  - Simplifies the assessment; a real system would pull dynamic rates.

---

## 7. Known Limitations / Incomplete Features

- Only USD and EUR are supported (no multi-currency extension logic yet).
- No UI-level 2FA or advanced security controls (rate limiting, IP throttling, etc.).
- Reporting/analytics over the `ledger_entries` table are minimal (just basic history and integrity checks).
- Test coverage is partial - not all services and controllers have comprehensive unit tests.

Core financial flows, integrity, and UI are complete per the assessment.

---

## 7.1 Minor Architectural Notes & Possible Improvements

- **AuthService vs LedgerService for initial deposits**

  - `AuthService.register` creates initial USD/EUR balances by inserting directly into `transactions` and `ledger_entries` within a single DB transaction. The primary transfer/exchange flows, however, go through `TransactionsService` and `LedgerService`, which also recalculate and persist `accounts.balance` explicitly.
  - For a larger codebase, we might:
    - Extract the "initial deposit" logic into a helper that reuses `TransactionsService`/`LedgerService`, or
    - Clearly document that initial seeding relies on DB-level behavior, while runtime flows always use the services.

- **Idempotency error handling surface**

  - `TransactionsService.transfer` and `exchange` treat `idempotency_key` conflicts via Postgres error code `23505` and then fetch the existing transaction. In a production system, we might add structured logging and/or return a more explicit error payload when something unexpected happens around idempotency (e.g. malformed key, conflicting payloads).

- **Frontend confirmation before processing**

  - The frontend includes a generic `Modal` component and transaction forms, but the current implementation intentionally keeps the UX simple. A dedicated "Are you sure?" confirmation step for transfer/exchange could be added using this modal to align with the suggested "transaction confirmation" should-have.

---

## 8. Deployment (Vercel + Render)

This project is set up for a simple cloud deployment with:

- **Backend** on **Render**
- **Frontend** on **Vercel**

Update the URLs below to your actual deployment endpoints.

### Backend (e.g. Render, Fly.io, Railway)

- Use `backend/Dockerfile` and `render.yaml` as a starting point.
- Provision a managed Postgres instance.
- Set `DATABASE_URL` in the backend environment.
- On deploy:
  - Run migrations (`npm run db:migrate`).
  - Optionally run seed (`npm run db:setup`) in non-production or demo environments.

### Frontend (e.g. Vercel, Netlify)

- Deploy the `frontend` Vite app.
- Configure environment variable for API base URL (if not using localhost).
- Ensure CORS on backend allows the frontend origin.

Update this README with final deployment URLs, for example:

- Backend: `https://your-backend.example.com/api`
- Frontend: `https://your-frontend.example.com`

---

## 9. Answers to Key Design Questions

**1. How do you ensure transaction atomicity?**

- Each financial operation (`transfer`, `exchange`) runs inside a single Postgres transaction using a shared `PoolClient`.
- We:
  - Lock accounts (`SELECT ... FOR UPDATE`).
  - Validate balances and currencies.
  - Insert into `transactions`.
  - Insert balanced `ledger_entries`.
  - Recalculate and update `accounts.balance`.
  - Commit.
- Any failure triggers a rollback; no partial state is persisted.

**2. How do you prevent double-spending?**

- Row-level locking on `accounts` prevents concurrent writes from racing.
- Balance checks (`from_balance >= amount`) are performed **after** locking.
- Idempotency keys:
  - Unique index on `transactions.idempotency_key`.
  - If the same key is re-used, the existing transaction is returned instead of re-processing.

**3. How do you maintain consistency between ledger entries and account balances?**

- After inserting ledger entries for a transaction, we:
  - Compute `SUM(amount)` per affected account from `ledger_entries`.
  - Write that sum into `accounts.balance` within the same DB transaction.
- `LedgerService.verifyAllAccountBalances` compares ledger sums vs `accounts.balance` for all accounts; `verifyLedgerIntegrity` exposes this via an endpoint.

**4. How do you handle decimal precision for different currencies?**

- All monetary fields use `numeric(18,2)` in Postgres (scale = 2).
- Exchange amounts are rounded to 2 decimals using `Math.round(x * 100) / 100` before writing ledger entries.
- Frontend uses helpers in `utils/formatters.ts` to display 2-decimal amounts.

**5. What indexing strategy do you use for the ledger_entries table?**

- `ledger_entries` indices:
  - `(account_id, created_at)` – fast per-account history and balance computations.
  - `transaction_id` – fast retrieval and aggregation per transaction.
- `transactions` indices:
  - `from_account_id`, `to_account_id`, `created_at` – efficient history and lookups.
  - Unique index on `idempotency_key` (partial) – enforces idempotency.

**6. How do you verify that balances are correctly synchronized?**

- Programmatic checks in `LedgerService.verifyAllAccountBalances` and `verifyLedgerIntegrity`:
  - For each account: compare `accounts.balance` with `SUM(ledger_entries.amount)`.
  - For each `transaction_id`: ensure `SUM(amount)` over its entries ~ 0.
- `GET /api/transactions/verify-integrity` exposes these checks.
- Integration tests (`transactions.integration.spec.ts`) assert:
  - Balances change exactly by the debited/credited amounts.
  - Each transaction produces a balanced pair of ledger entries.

**7. How would you scale this system for millions of users?**

- **Database:**
  - Add further indices for common queries.
  - Partition `ledger_entries` and `transactions` by time or account ranges.
  - Move heavy reporting/reconciliation jobs to read replicas.
- **Application:**
  - Run multiple stateless NestJS instances behind a load balancer.
  - Use connection pooling and tune Postgres.
- **Caching & queues:**
  - Cache frequently-read balances or summaries in Redis.
  - Offload non-critical tasks (notifications, heavy audits) to background workers using a queue.
- **Observability:**
  - Add metrics (failed transfers, unbalanced ledger checks, slow queries).
  - Use logs and traces to monitor latency and error rates.

---
