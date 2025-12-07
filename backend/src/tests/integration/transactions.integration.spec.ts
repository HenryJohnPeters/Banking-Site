import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../app.module";
import { db } from "../../shared/database/client";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

describe("TransactionsController (Integration)", () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: string;
  let usdAccountId: string;
  let eurAccountId: string;
  let otherUserUsdAccountId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  describe("POST /transactions/transfer", () => {
    it("should successfully transfer funds with proper double-entry bookkeeping", async () => {
      const transferAmount = 100.5;

      // Get initial balances
      const initialFromBalance = await getAccountBalance(usdAccountId);
      const initialToBalance = await getAccountBalance(otherUserUsdAccountId);

      const response = await request(app.getHttpServer())
        .post("/api/transactions/transfer")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          from_account_id: usdAccountId,
          to_account_id: otherUserUsdAccountId,
          amount: transferAmount,
          description: "Integration test transfer",
        })
        .expect(201);

      const transaction = response.body;

      // Verify transaction record
      expect(transaction.id).toBeDefined();
      expect(transaction.amount).toBe(transferAmount);
      expect(transaction.type).toBe("TRANSFER");
      expect(transaction.status).toBe("COMPLETED");

      // Verify account balances updated correctly
      const finalFromBalance = await getAccountBalance(usdAccountId);
      const finalToBalance = await getAccountBalance(otherUserUsdAccountId);

      expect(finalFromBalance).toBe(initialFromBalance - transferAmount);
      expect(finalToBalance).toBe(initialToBalance + transferAmount);

      // Verify double-entry bookkeeping in ledger
      const ledgerEntries = await getLedgerEntries(transaction.id);
      expect(ledgerEntries).toHaveLength(2);

      const debitEntry = ledgerEntries.find((e) => e.amount < 0);
      const creditEntry = ledgerEntries.find((e) => e.amount > 0);

      expect(debitEntry.amount).toBe(-transferAmount);
      expect(creditEntry.amount).toBe(transferAmount);
      expect(debitEntry.account_id).toBe(usdAccountId);
      expect(creditEntry.account_id).toBe(otherUserUsdAccountId);

      // Verify ledger balances (sum should be zero)
      const totalLedgerAmount = ledgerEntries.reduce(
        (sum, entry) => sum + parseFloat(entry.amount),
        0
      );
      expect(Math.abs(totalLedgerAmount)).toBeLessThan(0.01);
    });

    it("should reject transfer with insufficient funds", async () => {
      const accountBalance = await getAccountBalance(usdAccountId);
      const excessiveAmount = accountBalance + 100;

      await request(app.getHttpServer())
        .post("/api/transactions/transfer")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          from_account_id: usdAccountId,
          to_account_id: otherUserUsdAccountId,
          amount: excessiveAmount,
          description: "Should fail - insufficient funds",
        })
        .expect(400);
    });

    it("should reject transfer between different currencies", async () => {
      await request(app.getHttpServer())
        .post("/api/transactions/transfer")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          from_account_id: usdAccountId,
          to_account_id: eurAccountId,
          amount: 100,
          description: "Should fail - different currencies",
        })
        .expect(400);
    });
  });

  describe("POST /transactions/exchange", () => {
    it("should successfully exchange USD to EUR with proper ledger entries", async () => {
      const usdAmount = 100.0;
      const exchangeRate = 0.92;
      const expectedEurAmount =
        Math.round(usdAmount * exchangeRate * 100) / 100;

      // Get initial balances
      const initialUsdBalance = await getAccountBalance(usdAccountId);
      const initialEurBalance = await getAccountBalance(eurAccountId);

      const response = await request(app.getHttpServer())
        .post("/api/transactions/exchange")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          from_account_id: usdAccountId,
          to_account_id: eurAccountId,
          from_amount: usdAmount,
          exchange_rate: exchangeRate,
          description: "USD to EUR exchange test",
        })
        .expect(201);

      const transaction = response.body;

      // Verify account balances
      const finalUsdBalance = await getAccountBalance(usdAccountId);
      const finalEurBalance = await getAccountBalance(eurAccountId);

      expect(finalUsdBalance).toBe(initialUsdBalance - usdAmount);
      expect(finalEurBalance).toBe(initialEurBalance + expectedEurAmount);

      // Verify double-entry bookkeeping
      const ledgerEntries = await getLedgerEntries(transaction.id);
      expect(ledgerEntries).toHaveLength(2);

      const usdEntry = ledgerEntries.find((e) => e.account_id === usdAccountId);
      const eurEntry = ledgerEntries.find((e) => e.account_id === eurAccountId);

      expect(usdEntry.amount).toBe(-usdAmount);
      expect(eurEntry.amount).toBe(expectedEurAmount);
    });

    it("should reject exchange between same currency accounts", async () => {
      // Create another USD account for the user
      const anotherUsdAccount = await createAccountForUser(testUserId, "USD");

      await request(app.getHttpServer())
        .post("/api/transactions/exchange")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          from_account_id: usdAccountId,
          to_account_id: anotherUsdAccount,
          from_amount: 100,
          exchange_rate: 1.0,
        })
        .expect(400);
    });
  });

  describe("GET /transactions", () => {
    it("should return paginated transaction history", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/transactions?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("total");
      expect(response.body).toHaveProperty("page", 1);
      expect(response.body).toHaveProperty("limit", 10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("should filter transactions by type", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/transactions?type=TRANSFER")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((transaction) => {
        expect(transaction.type).toBe("TRANSFER");
      });
    });
  });

  describe("GET /transactions/verify-integrity", () => {
    it("should verify ledger integrity after multiple transactions", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/transactions/verify-integrity")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.errors).toHaveLength(0);
      expect(response.body.summary).toHaveProperty("totalTransactions");
      expect(response.body.summary).toHaveProperty("balancedTransactions");
      expect(response.body.summary).toHaveProperty("unbalancedTransactions", 0);
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test user
    testUserId = uuidv4();
    const hashedPassword = await bcrypt.hash("testpassword", 10);

    await db.query(
      "INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5)",
      [testUserId, "test@example.com", hashedPassword, "Test", "User"]
    );

    // Create accounts
    usdAccountId = uuidv4();
    eurAccountId = uuidv4();

    await db.query(
      "INSERT INTO accounts (id, user_id, currency, balance) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)",
      [
        usdAccountId,
        testUserId,
        "USD",
        1000.0,
        eurAccountId,
        testUserId,
        "EUR",
        500.0,
      ]
    );

    // Create another user and account for transfers
    const otherUserId = uuidv4();
    otherUserUsdAccountId = uuidv4();

    await db.query(
      "INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5)",
      [otherUserId, "other@example.com", hashedPassword, "Other", "User"]
    );

    await db.query(
      "INSERT INTO accounts (id, user_id, currency, balance) VALUES ($1, $2, $3, $4)",
      [otherUserUsdAccountId, otherUserId, "USD", 500.0]
    );

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "testpassword",
      });

    authToken = loginResponse.body.access_token;
  }

  async function cleanupTestData() {
    try {
      await db.query(
        "DELETE FROM ledger WHERE account_id IN (SELECT id FROM accounts WHERE user_id IN ($1, $2))",
        [testUserId, otherUserUsdAccountId]
      );
      await db.query(
        "DELETE FROM transactions WHERE from_account_id IN (SELECT id FROM accounts WHERE user_id IN ($1, $2)) OR to_account_id IN (SELECT id FROM accounts WHERE user_id IN ($1, $2))",
        [testUserId, otherUserUsdAccountId]
      );
      await db.query("DELETE FROM accounts WHERE user_id IN ($1, $2)", [
        testUserId,
        otherUserUsdAccountId,
      ]);
      await db.query("DELETE FROM users WHERE id IN ($1, $2)", [
        testUserId,
        otherUserUsdAccountId,
      ]);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  async function getAccountBalance(accountId: string): Promise<number> {
    const result = await db.query(
      "SELECT balance FROM accounts WHERE id = $1",
      [accountId]
    );
    return parseFloat(result.rows[0].balance);
  }

  async function getLedgerEntries(transactionId: string) {
    const result = await db.query(
      "SELECT * FROM ledger WHERE transaction_id = $1",
      [transactionId]
    );
    return result.rows;
  }

  async function createAccountForUser(
    userId: string,
    currency: string
  ): Promise<string> {
    const accountId = uuidv4();
    await db.query(
      "INSERT INTO accounts (id, user_id, currency, balance) VALUES ($1, $2, $3, $4)",
      [accountId, userId, currency, 0.0]
    );
    return accountId;
  }
});
