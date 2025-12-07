import { Pool } from "pg";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";

dotenv.config();

// Import constants
const INITIAL_BALANCES = {
  USD: 1000.0,
  EUR: 500.0,
} as const;

const BCRYPT_SALT_ROUNDS = 10;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedData() {
  console.log("Resetting data and seeding sample data...");

  // Start from a clean slate on every run
  await pool.query("TRUNCATE TABLE ledger_entries CASCADE");
  await pool.query("TRUNCATE TABLE transactions CASCADE");
  await pool.query("TRUNCATE TABLE accounts CASCADE");
  await pool.query("TRUNCATE TABLE users CASCADE");

  // Demo users (Alice, Bob, Carol)
  const users = [
    {
      id: uuidv4(),
      email: "alice@example.com",
      firstName: "Alice",
      lastName: "Smith",
      passwordHash: await bcrypt.hash("password123", BCRYPT_SALT_ROUNDS),
    },
    {
      id: uuidv4(),
      email: "bob@example.com",
      firstName: "Bob",
      lastName: "Johnson",
      passwordHash: await bcrypt.hash("password123", BCRYPT_SALT_ROUNDS),
    },
    {
      id: uuidv4(),
      email: "carol@example.com",
      firstName: "Carol",
      lastName: "Williams",
      passwordHash: await bcrypt.hash("password123", BCRYPT_SALT_ROUNDS),
    },
  ];

  for (const user of users) {
    await pool.query(
      "INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5)",
      [user.id, user.email, user.passwordHash, user.firstName, user.lastName]
    );
  }

  // Create accounts and initial balances
  for (const user of users) {
    const usdAccountId = uuidv4();
    const eurAccountId = uuidv4();

    await pool.query(
      "INSERT INTO accounts (id, user_id, currency, balance) VALUES ($1, $2, $3, $4)",
      [usdAccountId, user.id, "USD", INITIAL_BALANCES.USD]
    );

    await pool.query(
      "INSERT INTO accounts (id, user_id, currency, balance) VALUES ($1, $2, $3, $4)",
      [eurAccountId, user.id, "EUR", INITIAL_BALANCES.EUR]
    );

    // Initial deposits come from outside the system: from_account_id = NULL
    const usdDepositId = uuidv4();
    const eurDepositId = uuidv4();

    await pool.query(
      "INSERT INTO transactions (id, from_account_id, to_account_id, amount, currency, type, status, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        usdDepositId,
        null,
        usdAccountId,
        INITIAL_BALANCES.USD,
        "USD",
        "DEPOSIT",
        "COMPLETED",
        "Initial account deposit",
      ]
    );

    await pool.query(
      "INSERT INTO transactions (id, from_account_id, to_account_id, amount, currency, type, status, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [
        eurDepositId,
        null,
        eurAccountId,
        INITIAL_BALANCES.EUR,
        "EUR",
        "DEPOSIT",
        "COMPLETED",
        "Initial account deposit",
      ]
    );

    await pool.query(
      "INSERT INTO ledger_entries (id, account_id, transaction_id, amount, type, description) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        uuidv4(),
        usdAccountId,
        usdDepositId,
        INITIAL_BALANCES.USD,
        "CREDIT",
        "Initial USD deposit",
      ]
    );

    await pool.query(
      "INSERT INTO ledger_entries (id, account_id, transaction_id, amount, type, description) VALUES ($1, $2, $3, $4, $5, $6)",
      [
        uuidv4(),
        eurAccountId,
        eurDepositId,
        INITIAL_BALANCES.EUR,
        "CREDIT",
        "Initial EUR deposit",
      ]
    );
  }

  console.log("Sample data seeded successfully");
}

async function main() {
  try {
    await seedData();
    console.log("Database seeding completed!");
    console.log("Demo users created:");
    console.log("- alice@example.com (password: password123)");
    console.log("- bob@example.com (password: password123)");
    console.log("- carol@example.com (password: password123)");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await pool.end();
  }
}

main();
