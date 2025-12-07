# Mini Banking Platform

A simplified banking platform demonstrating financial logic, double entry accounting, and concurrency safety.

**Tech Stack:** NestJS · Drizzle ORM · PostgreSQL · JWT · React 19 · TypeScript · Tailwind · WebSockets

---

## User Management Approach

**Chosen: Registration + Pre-seeded Test Users**

- **Registration:** `/auth/register` with automatic USD ($1000) + EUR (€500) account creation
- **Test Users:** Pre-seeded for easy evaluation
  ```
  alice@example.com | password123
  bob@example.com   | password123
  carol@example.com | password123
  ```

---

## Quick Start

**Prerequisites:** Node.js, Docker

Ensure docker running and env files present for frontend and backend

```bash
# Backend
cd backend
npm install
npm run db:up        # Start PostgreSQL (Docker)
npm run db:migrate   # Apply schema
npm run db:setup     # Seed demo users
npm run start:dev    # → http://localhost:3001/api

# Frontend (new terminal)
cd frontend
npm install
npm run dev          # → http://localhost:5174
```

**Environment Files:**

```bash
# backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/banking
JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production-2025-banking-app
FRONTEND_ORIGIN=http://localhost:5174

# frontend/.env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

---

## Database Architecture

**5-Table Double-Entry System** with full audit trails:

```sql
-- Core Tables
users (id, email, password_hash, created_at)
accounts (id, user_id, currency, balance, created_at)
transactions (id, from_account_id, to_account_id, amount, currency, type, idempotency_key)

-- Double-Entry Ledger (Authoritative Source)
ledger_entries (id, transaction_id, account_id, amount, type, description)
  ↳ Every transaction creates TWO balanced entries (sum = 0)
  ↳ Account balances calculated from ledger entries

-- Compliance & Security
audit_log (id, user_id, action, resource_type, ip_address, details)
  ↳ Tracks LOGIN, TRANSFER, EXCHANGE actions with IP logging
```

**Double-Entry Mechanics:**
Each financial transaction creates **exactly 2 ledger entries** that balance to zero:

```sql
-- Example: Alice transfers $100 to Bob
INSERT INTO transactions (id, from_account_id, to_account_id, amount, currency, type)
VALUES ('tx-123', 'alice-usd', 'bob-usd', 100.00, 'USD', 'TRANSFER');

-- Creates TWO balanced ledger entries:
INSERT INTO ledger_entries VALUES
  ('entry-1', 'tx-123', 'alice-usd', -100.00, 'DEBIT', 'Transfer to Bob'),   -- Alice loses $100
  ('entry-2', 'tx-123', 'bob-usd',   +100.00, 'CREDIT', 'Transfer from Alice'); -- Bob gains $100

-- Mathematical Proof: -100.00 + 100.00 = 0 ✅
```

**Currency Exchange Example:**

```sql
-- Alice exchanges $100 → €92 (rate: 1 USD = 0.92 EUR)
INSERT INTO transactions (id, from_account_id, to_account_id, amount, currency, type)
VALUES ('tx-456', 'alice-usd', 'alice-eur', 100.00, 'USD', 'EXCHANGE');

-- Creates TWO balanced ledger entries:
INSERT INTO ledger_entries VALUES
  ('entry-3', 'tx-456', 'alice-usd', -100.00, 'DEBIT', 'USD to EUR exchange'),   -- Alice loses $100
  ('entry-4', 'tx-456', 'alice-eur', +92.00, 'CREDIT', 'USD to EUR exchange');  -- Alice gains €92

-- Note: Different currencies but transaction integrity maintained
```

**Balance Consistency Strategy:**

1. **Ledger as Source of Truth** - Balances derived from ledger entries
2. **Atomic Transactions** - `SELECT ... FOR UPDATE` prevents race conditions
3. **Concurrency Safety** - Ordered account locking prevents deadlocks
4. **Audit Trail** - Immutable transaction history for compliance
5. **Mathematical Integrity** - Every transaction's ledger entries sum to zero

---

## Transaction Processing

### Transfer Transaction Flow

**Step-by-Step Process (`backend/src/modules/transactions/transactions.service.ts`):**

```
// 1. VALIDATION PHASE
//    - Amount must be positive
//    - Cannot transfer to same account
//    Location: transactions.service.ts:transfer()

// 2. IDEMPOTENCY CHECK
//    - Check if transaction already exists
//    - Prevent duplicate processing
//    Location: transactions.service.ts:findTransactionByIdempotencyKey()

// 3. DEADLOCK-SAFE LOCKING
//    - Sort account IDs for deterministic order
//    - Lock accounts with SELECT FOR UPDATE
//    Location: accounts.repository.ts:lockUserAccount()

// 4. BUSINESS RULE VALIDATION
//    - Verify same currency for transfers
//    - Check account ownership
//    Location: transactions.service.ts:transfer()

// 5. PRECISE BALANCE CHECK
//    - Use Decimal.js for accuracy
//    - Ensure sufficient funds
//    Location: transactions.service.ts:transfer()

// 6. CREATE TRANSACTION RECORD
//    - Insert into transactions table
//    - Generate unique transaction ID
//    Location: transactions.repository.ts:insertTransfer()

// 7. CREATE DOUBLE-ENTRY LEDGER ENTRIES
//    - Debit sender account (-amount)
//    - Credit receiver account (+amount)
//    Location: ledger.service.ts:createLedgerEntries()

// 8. RECALCULATE BALANCES FROM LEDGER
//    - Sum ledger entries for each account
//    - Update accounts.balance field
//    Location: ledger.repository.ts:calculateAccountBalance()
//             accounts.repository.ts:updateAccountBalance()

// 9. COMMIT TRANSACTION
//    - All operations succeed or fail together
//    - Database transaction wrapper
//    Location: shared/database/transaction.ts:withTransaction()
```

### Currency Exchange Flow

**Cross-Currency Process (`backend/src/modules/transactions/transactions.service.ts`):**

```
// 1. DECIMAL CALCULATION
//    - Precise exchange rate math
//    - Round to 2 decimal places
//    Location: transactions.service.ts:exchange()

// 2. CURRENCY VALIDATION
//    - Ensure different currencies
//    - Validate exchange rate
//    Location: transactions.service.ts:exchange()

// 3. CROSS-CURRENCY LEDGER ENTRIES
//    - Debit source currency account
//    - Credit target currency account
//    Location: ledger.service.ts:createCrossLedgerEntries()

// 4. BALANCE UPDATES
//    - Update both currency account balances
//    - Maintain ledger integrity
//    Location: ledger.repository.ts:calculateAccountBalance()
```

**Transaction Rollback Example:**

```sql
BEGIN TRANSACTION;
    -- Step 1: Lock accounts
    -- Step 2: Validate balances
    -- Step 3: Create transaction record
    -- Step 4: Insert ledger entries
    -- Step 5: Update account balances

    -- If ANY step fails:
    ROLLBACK; -- All changes undone atomically

    -- If ALL steps succeed:
    COMMIT; -- All changes persisted together
```

### Concurrency Control

**Database Locking (`backend/src/modules/accounts/accounts.repository.ts`):**

```sql
-- Deterministic account locking to prevent deadlocks
SELECT * FROM accounts
WHERE id IN (?, ?)
ORDER BY id ASC
FOR UPDATE;
```

**Simple Deadlock Prevention:**

```typescript
// Problem: Two users transferring to each other at the same time
// Alice → Bob: Lock Alice, then Bob
// Bob → Alice: Lock Bob, then Alice
// Result: Both wait forever (deadlock)

// Solution: Always lock accounts in the same order
const accountsToLock = [account1, account2].sort();
// Now both transactions lock accounts alphabetically
// Alice → Bob: Lock Alice, then Bob
// Bob → Alice: ALSO lock Alice first, then Bob
// Result: No deadlock, transactions happen one after another
```

**Error Handling (`backend/src/modules/transactions/transactions.service.ts`):**

```typescript
// If PostgreSQL detects a deadlock (rare with our prevention)
if (error.code === "40P01") {
  throw "Transaction conflict detected. Please retry.";
}

// If user clicks "Transfer" button multiple times
if (error.code === "23505") {
  return existing_transaction; // Return the first successful transfer
}
```

**Why This Matters:**

- **Prevents system freezes** when many users transfer money simultaneously
- **Handles double-clicks** gracefully (no duplicate transfers)
- **Keeps money safe** even under heavy load

**Real-Time Updates**

**WebSocket Notifications (`backend/src/shared/gateways/balance.gateway.ts`):**

```
// After successful commit
EMIT balance_update TO user_room
EMIT transaction_notification TO affected_users
```

### Performance Optimizations

**Database Indexing Strategy:**

```sql
-- Fast transaction history queries
CREATE INDEX ON transactions(user_id, created_at DESC);
CREATE INDEX ON ledger_entries(account_id, created_at DESC);

-- Efficient idempotency checks
CREATE UNIQUE INDEX ON transactions(idempotency_key)
WHERE idempotency_key IS NOT NULL;
```

**Connection Pooling:**

```
DATABASE_POOL:
    max_connections: 20
    idle_timeout: 30_seconds
    connection_timeout: 2_seconds
    retry_attempts: 3
```

---

## Core Features

**Authentication & Accounts**

- JWT + httpOnly cookies, registration/login flows
- Auto-created USD/EUR accounts per user
- `/auth/register`, `/auth/login`, `/auth/me`

**Financial Operations**

- Same-currency transfers with concurrency control
- USD↔EUR exchange (1 USD = 0.92 EUR fixed rate)
- `/transactions/transfer`, `/transactions/exchange`

**Transaction History**

- Paginated history with type filters
- Real-time balance updates via WebSockets
- `/transactions?page=1&limit=10&type=transfer`

**Frontend Dashboard**

- Live USD/EUR balances, recent transactions
- Transfer/exchange forms with validation
- Real-time updates, transaction history with filters

---

## Design Decisions & Trade-offs

| **Decision**             | **Rationale**                                   | **Trade-off**                     |
| ------------------------ | ----------------------------------------------- | --------------------------------- |
| **PostgreSQL**           | ACID compliance, decimal precision, row locking | More complex vs SQLite            |
| **Drizzle ORM**          | Type-safe queries, lightweight, TS integration  | Less mature vs Prisma             |
| **DECIMAL(18,2)**        | Avoid floating-point errors in finance          | Storage overhead vs accuracy      |
| **Fixed Exchange Rate**  | Simplifies assessment implementation            | vs Real-time API integration      |
| **JWT httpOnly Cookies** | XSS protection + stateless auth                 | Complex CORS vs security          |
| **SELECT FOR UPDATE**    | Prevents race conditions & deadlocks            | Performance impact vs consistency |

**Time-Boxed Limitations:**

- UI: Minimal design focused on functionality
- Testing: 35 tests covering critical logic (vs full E2E coverage)
- Static config: Hardcoded rates (vs dynamic configuration)
- Basic monitoring: Health checks only (vs full observability)

---

## Deployment

Due to time constraints I did not complete this step.

I have done this before and is a simple setup should be as follows.

### Backend (Render)

```bash
# 1. Create PostgreSQL database on Render
# 2. Set environment variables:
DATABASE_URL=postgresql://user:pass@dpg-xxx.render.com:5432/banking_db
JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production-2025-banking-app
NODE_ENV=production
FRONTEND_ORIGIN=https://your-frontend.vercel.app

# 3. Deploy with auto-migration
Build: cd backend && npm install && npm run build
Start: cd backend && npm run db:migrate && npm start
```

### Frontend (Vercel)

```bash
# 1. Set environment variables:
VITE_API_URL=https://your-backend.onrender.com/api
VITE_WS_URL=https://your-backend.onrender.com

# 2. Deploy
cd frontend && npx vercel --prod
```

**Database Setup:** Migrations run automatically on deployment. Run `npm run db:setup` once in Render shell for demo users.

---

## Testing & Validation

**Test Coverage (35 files):**

- **Backend:** Services, repositories, controllers, integration tests
- **Frontend:** Components, hooks, contexts, utility functions
- **Focus:** Financial logic, concurrency control, validation, error handling

```bash
# Backend Testing
cd backend && npm test        # All tests
npm run test:cov             # Coverage report

# Frontend Testing
cd frontend && npm test       # React tests
npm run test:watch           # Watch mode
```

**Key Test Areas:** Double-entry integrity, concurrent safety, decimal precision, authentication flows, error boundaries.

---

## Additional Production Features

**Security & Monitoring:**

- Helmet.js security headers, input sanitization
- Health check endpoint (`/api/health`)
- Comprehensive audit logging with IP tracking
- Environment validation on startup

**Real-Time & Performance:**

- WebSocket gateway with JWT authentication
- Strategic database indexing (account_id, created_at)
- Connection pooling, partial unique indexes
- User-specific WebSocket rooms

**Development Experience:**

- Docker Compose for one-command setup
- TypeScript throughout, centralized constants
- Decimal.js for accurate financial calculations
- Swagger API docs at `/api/docs`
- Proper error boundaries and loading states

---

## Related Projects

**🎲 BetFlix – Basic web3 Auth site**  
[https://github.com/HenryJohnPeters/BetFlix](https://github.com/HenryJohnPeters/BetFlix)

**🏛️ HenrysClub – Basic Lightweight TypeScript Express DynamoDb API**  
[https://github.com/HenryJohnPeters/HenrysClub](https://github.com/HenryJohnPeters/HenrysClub)

---
