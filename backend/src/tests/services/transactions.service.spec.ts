import { Test, TestingModule } from "@nestjs/testing";
import { TransactionsService } from "../../modules/transactions/transactions.service";
import { AccountsService } from "../../modules/accounts/accounts.service";
import { db } from "../../shared/database/client";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Currency } from "../../models/Account";
import { TransactionType } from "../../models/Transaction";

// Mock the database client
jest.mock("../../shared/database/client");

const mockDb = {
  getPool: jest.fn().mockReturnValue({
    query: jest.fn(),
  }),
  query: jest.fn(),
};

const mockAccountsService = {
  getAccountById: jest.fn(),
  updateAccountBalance: jest.fn(),
};

describe("TransactionsService", () => {
  let service: TransactionsService;
  let accountsService: AccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: AccountsService,
          useValue: mockAccountsService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    accountsService = module.get<AccountsService>(AccountsService);

    // Reset mocks
    jest.clearAllMocks();
    (db as any) = mockDb;
  });

  describe("transfer", () => {
    const mockFromAccount = {
      id: "from-account-id",
      user_id: "user-id",
      currency: Currency.USD,
      balance: 1000.0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockToAccount = {
      id: "to-account-id",
      user_id: "other-user-id",
      currency: Currency.USD,
      balance: 500.0,
    };

    beforeEach(() => {
      mockDb.getPool.mockReturnValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ command: "BEGIN" }) // BEGIN transaction
          .mockResolvedValueOnce({ rows: [mockToAccount] }) // Find to_account
          .mockResolvedValueOnce({ command: "INSERT" }) // Insert transaction
          .mockResolvedValueOnce({ command: "INSERT" }) // Insert debit ledger entry
          .mockResolvedValueOnce({ command: "INSERT" }) // Insert credit ledger entry
          .mockResolvedValueOnce({ command: "UPDATE" }) // Update from account balance
          .mockResolvedValueOnce({ command: "UPDATE" }) // Update to account balance
          .mockResolvedValueOnce({ command: "COMMIT" }), // COMMIT transaction
      });

      mockDb.query.mockResolvedValue({
        rows: [{ id: "transaction-id", type: TransactionType.TRANSFER }],
      });

      mockAccountsService.getAccountById.mockResolvedValue(mockFromAccount);
    });

    it("should successfully transfer funds between accounts", async () => {
      const transferDto = {
        from_account_id: "from-account-id",
        to_account_id: "to-account-id",
        amount: 100.0,
        description: "Test transfer",
      };

      const result = await service.transfer("user-id", transferDto);

      expect(result).toBeDefined();
      expect(mockAccountsService.getAccountById).toHaveBeenCalledWith(
        "from-account-id",
        "user-id"
      );
    });

    it("should throw error for insufficient balance", async () => {
      const insufficientBalanceAccount = { ...mockFromAccount, balance: 50.0 };
      mockAccountsService.getAccountById.mockResolvedValue(
        insufficientBalanceAccount
      );

      const transferDto = {
        from_account_id: "from-account-id",
        to_account_id: "to-account-id",
        amount: 100.0,
        description: "Test transfer",
      };

      await expect(service.transfer("user-id", transferDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw error for negative amount", async () => {
      const transferDto = {
        from_account_id: "from-account-id",
        to_account_id: "to-account-id",
        amount: -100.0,
        description: "Test transfer",
      };

      await expect(service.transfer("user-id", transferDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw error for same account transfer", async () => {
      const transferDto = {
        from_account_id: "same-account-id",
        to_account_id: "same-account-id",
        amount: 100.0,
        description: "Test transfer",
      };

      await expect(service.transfer("user-id", transferDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw error for different currency accounts", async () => {
      const eurToAccount = { ...mockToAccount, currency: Currency.EUR };
      mockDb.getPool().query.mockResolvedValueOnce({ rows: [eurToAccount] });

      const transferDto = {
        from_account_id: "from-account-id",
        to_account_id: "to-account-id",
        amount: 100.0,
        description: "Test transfer",
      };

      await expect(service.transfer("user-id", transferDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("exchange", () => {
    const mockUsdAccount = {
      id: "usd-account-id",
      user_id: "user-id",
      currency: Currency.USD,
      balance: 1000.0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockEurAccount = {
      id: "eur-account-id",
      user_id: "user-id",
      currency: Currency.EUR,
      balance: 500.0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockDb.getPool.mockReturnValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ command: "BEGIN" })
          .mockResolvedValueOnce({ command: "INSERT" }) // debit transaction
          .mockResolvedValueOnce({ command: "INSERT" }) // credit transaction
          .mockResolvedValueOnce({ command: "INSERT" }) // debit ledger entry
          .mockResolvedValueOnce({ command: "INSERT" }) // credit ledger entry
          .mockResolvedValueOnce({ command: "UPDATE" }) // update from account
          .mockResolvedValueOnce({ command: "UPDATE" }) // update to account
          .mockResolvedValueOnce({ command: "COMMIT" }),
      });

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: "debit-transaction-id" }] })
        .mockResolvedValueOnce({ rows: [{ id: "credit-transaction-id" }] });
    });

    it("should successfully exchange USD to EUR", async () => {
      mockAccountsService.getAccountById
        .mockResolvedValueOnce(mockUsdAccount)
        .mockResolvedValueOnce(mockEurAccount);

      const exchangeDto = {
        from_account_id: "usd-account-id",
        to_account_id: "eur-account-id",
        from_amount: 100.0,
        exchange_rate: 0.92,
        description: "USD to EUR exchange",
      };

      const result = await service.exchange("user-id", exchangeDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.type).toBe(TransactionType.EXCHANGE);
    });

    it("should throw error for same currency exchange", async () => {
      const anotherUsdAccount = {
        ...mockUsdAccount,
        id: "another-usd-account-id",
      };
      mockAccountsService.getAccountById
        .mockResolvedValueOnce(mockUsdAccount)
        .mockResolvedValueOnce(anotherUsdAccount);

      const exchangeDto = {
        from_account_id: "usd-account-id",
        to_account_id: "another-usd-account-id",
        from_amount: 100.0,
        exchange_rate: 0.92,
        description: "Invalid exchange",
      };

      await expect(service.exchange("user-id", exchangeDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("should throw error for insufficient balance", async () => {
      const lowBalanceAccount = { ...mockUsdAccount, balance: 50.0 };
      mockAccountsService.getAccountById
        .mockResolvedValueOnce(lowBalanceAccount)
        .mockResolvedValueOnce(mockEurAccount);

      const exchangeDto = {
        from_account_id: "usd-account-id",
        to_account_id: "eur-account-id",
        from_amount: 100.0,
        exchange_rate: 0.92,
        description: "Exchange with insufficient funds",
      };

      await expect(service.exchange("user-id", exchangeDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe("getExchangeRates", () => {
    it("should return fixed exchange rates", async () => {
      const rates = await service.getExchangeRates();

      expect(rates.USD_TO_EUR).toBe(0.92);
      expect(rates.EUR_TO_USD).toBeCloseTo(1.09, 2);
    });
  });
});
