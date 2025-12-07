import { Test, TestingModule } from "@nestjs/testing";
import { LedgerService } from "../../modules/ledger/ledger.service";
import { LedgerRepository } from "../../modules/ledger/ledger.repository";
import { BadRequestException } from "@nestjs/common";
import { DatabaseService } from "../../shared/database/client";

describe("LedgerService", () => {
  let service: LedgerService;
  let repository: LedgerRepository;

  const mockDatabaseService = {
    getClient: jest.fn(),
    executeInTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        LedgerRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    repository = module.get<LedgerRepository>(LedgerRepository);
    jest.clearAllMocks();
  });

  describe("createLedgerEntries", () => {
    it("should reject unbalanced ledger entries", async () => {
      const unbalancedEntries = [
        {
          transaction_id: "tx-1",
          account_id: "acc-1",
          amount: -100,
          type: "DEBIT",
          description: "Debit entry",
        },
        {
          transaction_id: "tx-1",
          account_id: "acc-2",
          amount: 50, // Unbalanced!
          type: "CREDIT",
          description: "Credit entry",
        },
      ];

      const mockClient = {} as any;

      await expect(
        service.createLedgerEntries(unbalancedEntries, mockClient)
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject entries without transaction context", async () => {
      const entries = [
        {
          transaction_id: "tx-1",
          account_id: "acc-1",
          amount: -100,
          type: "DEBIT",
          description: "Debit entry",
        },
        {
          transaction_id: "tx-1",
          account_id: "acc-2",
          amount: 100,
          type: "CREDIT",
          description: "Credit entry",
        },
      ];

      await expect(
        service.createLedgerEntries(entries, undefined)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("verifyTransactionBalance", () => {
    it("should verify balanced transaction", async () => {
      const mockEntries = [
        {
          id: "entry-1",
          transaction_id: "tx-1",
          account_id: "acc-1",
          amount: -100,
          type: "DEBIT",
          description: "Test",
          created_at: new Date(),
        },
        {
          id: "entry-2",
          transaction_id: "tx-1",
          account_id: "acc-2",
          amount: 100,
          type: "CREDIT",
          description: "Test",
          created_at: new Date(),
        },
      ];

      jest
        .spyOn(service, "getLedgerEntriesByTransaction")
        .mockResolvedValue(mockEntries as any);

      const result = await service.verifyTransactionBalance("tx-1");

      expect(result.isBalanced).toBe(true);
      expect(result.totalAmount).toBe(0);
    });

    it("should detect unbalanced transaction", async () => {
      const mockEntries = [
        {
          id: "entry-1",
          transaction_id: "tx-1",
          account_id: "acc-1",
          amount: -100,
          type: "DEBIT",
          description: "Test",
          created_at: new Date(),
        },
        {
          id: "entry-2",
          transaction_id: "tx-1",
          account_id: "acc-2",
          amount: 50,
          type: "CREDIT",
          description: "Test",
          created_at: new Date(),
        },
      ];

      jest
        .spyOn(service, "getLedgerEntriesByTransaction")
        .mockResolvedValue(mockEntries as any);

      const result = await service.verifyTransactionBalance("tx-1");

      expect(result.isBalanced).toBe(false);
      expect(result.totalAmount).toBe(-50);
    });
  });

  describe("calculateAccountBalance", () => {
    it("should calculate correct account balance from ledger", async () => {
      jest
        .spyOn(repository, "calculateAccountBalance")
        .mockResolvedValue(1234.56);

      const balance = await service.calculateAccountBalance("acc-1");

      expect(balance).toBe(1234.56);
    });

    it("should return 0 for account with no entries", async () => {
      jest.spyOn(repository, "calculateAccountBalance").mockResolvedValue(0);

      const balance = await service.calculateAccountBalance("empty-acc");

      expect(balance).toBe(0);
    });
  });

  describe("verifyAllAccountBalances", () => {
    it("should identify consistent accounts", async () => {
      jest.spyOn(repository, "getAllAccountBalances").mockResolvedValue([
        { id: "acc-1", account_balance: 1000.0, ledger_balance: 1000.0 },
        { id: "acc-2", account_balance: 500.5, ledger_balance: 500.5 },
      ] as any);

      const result = await service.verifyAllAccountBalances();

      expect(result.consistentAccounts).toBe(2);
      expect(result.inconsistentAccounts).toHaveLength(0);
    });

    it("should identify inconsistent accounts", async () => {
      jest.spyOn(repository, "getAllAccountBalances").mockResolvedValue([
        { id: "acc-1", account_balance: 1000.0, ledger_balance: 900.0 },
        { id: "acc-2", account_balance: 500.5, ledger_balance: 500.5 },
      ] as any);

      const result = await service.verifyAllAccountBalances();

      expect(result.consistentAccounts).toBe(1);
      expect(result.inconsistentAccounts).toHaveLength(1);
      expect(result.inconsistentAccounts[0].accountId).toBe("acc-1");
      expect(result.inconsistentAccounts[0].difference).toBe(100);
    });
  });
});
