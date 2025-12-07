import { Pool } from "pg";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";

dotenv.config();

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

  // Single demo user (Alice)
  const users = [
    {
      id: uuidv4(),
      email: "alice@example.com",
      firstName: "Alice",
      lastName: "Smith",
      passwordHash: await bcrypt.hash("password123", 10),
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
      [usdAccountId, user.id, "USD", 1000.0]
    );

    await pool.query(
      "INSERT INTO accounts (id, user_id, currency, balance) VALUES ($1, $2, $3, $4)",
      [eurAccountId, user.id, "EUR", 500.0]
    );

    // Initial deposits come from outside the system: from_account_id = NULL
    const usdDepositId = uuidv4();
    const eurDepositId = uuidv4();

    await pool.query(
      "INSERT INTO transactions (id, from_account_id, to_account_id, amount, currency, type, status, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [usdDepositId, null, usdAccountId, 1000.0, "USD", "DEPOSIT", "COMPLETED", "Initial account deposit"]
    );

    await pool.query(
      "INSERT INTO transactions (id, from_account_id, to_account_id, amount, currency, type, status, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [eurDepositId, null, eurAccountId, 500.0, "EUR", "DEPOSIT", "COMPLETED", "Initial account deposit"]
    );

    await pool.query(
      "INSERT INTO ledger_entries (id, account_id, transaction_id, amount, type, description) VALUES ($1, $2, $3, $4, $5, $6)",
      [uuidv4(), usdAccountId, usdDepositId, 1000.0, "CREDIT", "Initial USD deposit"]
    );

    await pool.query(
      "INSERT INTO ledger_entries (id, account_id, transaction_id, amount, type, description) VALUES ($1, $2, $3, $4, $5, $6)",
      [uuidv4(), eurAccountId, eurDepositId, 500.0, "CREDIT", "Initial EUR deposit"]
    );
  }

  console.log("Sample data seeded successfully");
}

async function main() {
  try {
    await seedData();
    console.log("Database seeding completed!");
    console.log("Sample user: alice@example.com (password: password123)");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await pool.end();
  }
}

main();
