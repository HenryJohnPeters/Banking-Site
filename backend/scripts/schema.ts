import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const currencyEnum = pgEnum("currency", ["USD", "EUR"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  currency: currencyEnum("currency").notNull(),
  balance: numeric("balance", { precision: 18, scale: 2 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromAccountId: uuid("from_account_id").references(() => accounts.id),
    toAccountId: uuid("to_account_id")
      .notNull()
      .references(() => accounts.id),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    description: varchar("description", { length: 500 }),
    referenceId: varchar("reference_id", { length: 100 }),
    idempotencyKey: varchar("idempotency_key", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      fromAccountIdx: index("transactions_from_account_id_idx").on(
        table.fromAccountId
      ),
      toAccountIdx: index("transactions_to_account_id_idx").on(
        table.toAccountId
      ),
      createdAtIdx: index("transactions_created_at_idx").on(table.createdAt),
      typeIdx: index("transactions_type_idx").on(table.type),
      idempotencyKeyUniqueIdx: uniqueIndex(
        "transactions_idempotency_key_unique_idx"
      )
        .on(table.idempotencyKey)
        .where(sql`idempotency_key IS NOT NULL`),
    };
  }
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    description: varchar("description", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      accountCreatedAtIdx: index("ledger_entries_account_created_at_idx").on(
        table.accountId,
        table.createdAt
      ),
      transactionIdx: index("ledger_entries_transaction_id_idx").on(
        table.transactionId
      ),
    };
  }
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 100 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }),
    details: varchar("details", { length: 2000 }), // JSON string
    ipAddress: varchar("ip_address", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("audit_log_user_id_idx").on(table.userId),
      createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt),
      actionIdx: index("audit_log_action_idx").on(table.action),
    };
  }
);
