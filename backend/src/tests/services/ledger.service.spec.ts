import { Test, TestingModule } from "@nestjs/testing";
import { LedgerService } from "../../modules/ledger/ledger.service";
import { db } from "../../shared/database/client";
import { v4 as uuidv4 } from "uuid";
import { BadRequestException } from "@nestjs/common";

jest.mock("../../db/client");

const mockDb = {
  getPool: jest.fn(),
  query: jest.fn(),
};

describe("LedgerService", () => {
  let service: LedgerService;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockDb.getPool.mockReturnValue({
      connect: jest.fn().mockResolvedValue(mockClient),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [LedgerService],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    (db as any) = mockDb;
    jest.clearAllMocks();
  });

  describe("createLedgerEntries", () => {
    it("should create balanced ledger entries successfully", async () => {
      const entries = [
        {
          transaction_id: "tx-1",
          account_id: "acc-1",
          amount: -100,
          description: "Debit entry",
        },
        {
          transaction_id: "tx-1",
          account_id: "acc-2",
          amount: 100,
          description: "Credit entry",
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({ command: "BEGIN" })
        .mockResolvedValueOnce({ command: "INSERT" })
        .mockResolvedValueOnce({ command: "INSERT" })
        .mockResolvedValueOnce({ command: "COMMIT" });

      await service.createLedgerEntries(entries);

      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });

    it("should reject unbalanced ledger entries", async () => {
      const unbalancedEntries = [
        {
          transaction_id: "tx-1",
          account_id: "acc-1",
          amount: -100,
          description: "Debit entry",
        },
        {
          transaction_id: "tx-1",
          account_id: "acc-2",
          amount: 50, // Unbalanced!
          description: "Credit entry",
        },
      ];

      await expect(
        service.createLedgerEntries(unbalancedEntries)
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow minor rounding differences (< 0.01)", async () => {
      const entriesWithRounding = [
        {
          transaction_id: "tx-1",
          account_id: "acc-1",
          amount: -100.001,
          description: "Debit entry",
        },
        {
          transaction_id: "tx-1",
          account_id: "acc-2",
          amount: 100.002,
          description: "Credit entry",
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({ command: "BEGIN" })
        .mockResolvedValueOnce({ command: "INSERT" })
        .mockResolvedValueOnce({ command: "INSERT" })
        .mockResolvedValueOnce({ command: "COMMIT" });

      await expect(
        service.createLedgerEntries(entriesWithRounding)
      ).resolves.not.toThrow();
    });

    it("should rollback on database error", async () => {
      const entries = [
        {
          transaction_id: "tx-1",
          account_id: "acc-1",
          amount: -100,
          description: "Debit entry",
        },
        {
          transaction_id: "tx-1",
          account_id: "acc-2",
          amount: 100,
          description: "Credit entry",
        },
      ];

      mockClient.query
        .mockResolvedValueOnce({ command: "BEGIN" })
        .mockRejectedValueOnce(new Error("Database error"));

      await expect(service.createLedgerEntries(entries)).rejects.toThrow(
        "Database error"
      );
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    });
  });

  describe("verifyTransactionBalance", () => {
    it("should verify balanced transaction", async () => {
      const mockEntries = [
        { transaction_id: "tx-1", account_id: "acc-1", amount: -100 },
        { transaction_id: "tx-1", account_id: "acc-2", amount: 100 },
      ];

      mockDb.query.mockResolvedValue({ rows: mockEntries });

      const result = await service.verifyTransactionBalance("tx-1");

      expect(result.isBalanced).toBe(true);
      expect(result.totalAmount).toBe(0);
    });

    it("should detect unbalanced transaction", async () => {
      const mockEntries = [
        { transaction_id: "tx-1", account_id: "acc-1", amount: -100 },
        { transaction_id: "tx-1", account_id: "acc-2", amount: 50 },
      ];

      mockDb.query.mockResolvedValue({ rows: mockEntries });

      const result = await service.verifyTransactionBalance("tx-1");

      expect(result.isBalanced).toBe(false);
      expect(result.totalAmount).toBe(-50);
    });
  });

  describe("calculateAccountBalance", () => {
    it("should calculate correct account balance from ledger", async () => {
      mockDb.query.mockResolvedValue({ rows: [{ balance: "1234.56" }] });

      const balance = await service.calculateAccountBalance("acc-1");

      expect(balance).toBe(1234.56);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining("SUM(amount)"),
        ["acc-1"]
      );
    });

    it("should return 0 for account with no entries", async () => {
      mockDb.query.mockResolvedValue({ rows: [{ balance: "0" }] });

      const balance = await service.calculateAccountBalance("empty-acc");

      expect(balance).toBe(0);
    });
  });

  describe("verifyAllAccountBalances", () => {
    it("should identify consistent accounts", async () => {
      const mockAccounts = [
        { id: "acc-1", account_balance: "1000.00", ledger_balance: "1000.00" },
        { id: "acc-2", account_balance: "500.50", ledger_balance: "500.50" },
      ];

      mockDb.query.mockResolvedValue({ rows: mockAccounts });

      const result = await service.verifyAllAccountBalances();

      expect(result.consistentAccounts).toBe(2);
      expect(result.inconsistentAccounts).toHaveLength(0);
    });

    it("should identify inconsistent accounts", async () => {
      const mockAccounts = [
        { id: "acc-1", account_balance: "1000.00", ledger_balance: "900.00" },
        { id: "acc-2", account_balance: "500.50", ledger_balance: "500.50" },
      ];

      mockDb.query.mockResolvedValue({ rows: mockAccounts });

      const result = await service.verifyAllAccountBalances();

      expect(result.consistentAccounts).toBe(1);
      expect(result.inconsistentAccounts).toHaveLength(1);
      expect(result.inconsistentAccounts[0].accountId).toBe("acc-1");
      expect(result.inconsistentAccounts[0].difference).toBe(100);
    });
  });
});
