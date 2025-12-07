import { Test, TestingModule } from "@nestjs/testing";
import { TransactionsController } from "../../modules/transactions/transactions.controller";
import { TransactionsService } from "../../modules/transactions/transactions.service";
import { LedgerService } from "../../modules/ledger/ledger.service";
import { BadRequestException } from "@nestjs/common";

describe("TransactionsController", () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockTransactionsService = {
    transfer: jest.fn(),
    exchange: jest.fn(),
    getUserTransactionHistory: jest.fn(),
    getExchangeRates: jest.fn(),
  };

  const mockLedgerService = {
    verifyLedgerIntegrity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: LedgerService,
          useValue: mockLedgerService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("transfer", () => {
    it("should successfully create a transfer", async () => {
      const mockRequest = { user: { sub: "user-123" } }; // JWT payload format
      const transferDto = {
        from_account_id: "account-1",
        to_account_id: "account-2",
        amount: 100,
        description: "Test transfer",
      };

      const expectedResult = {
        id: "tx-123",
        ...transferDto,
        currency: "USD",
        type: "TRANSFER",
        status: "COMPLETED",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTransactionsService.transfer.mockResolvedValue(expectedResult);

      const result = await controller.transfer(
        mockRequest as any,
        transferDto,
        "127.0.0.1",
      );

      expect(result).toEqual(expectedResult);
      expect(service.transfer).toHaveBeenCalledWith(
        "user-123",
        transferDto,
        "127.0.0.1",
      );
    });

    it("should validate transfer DTO", async () => {
      const mockRequest = { user: { sub: "user-123" } };
      const invalidDto = {
        from_account_id: "",
        to_account_id: "",
        amount: -100, // Invalid: negative
      };

      mockTransactionsService.transfer.mockRejectedValue(
        new BadRequestException("Transfer amount must be positive"),
      );

      await expect(
        controller.transfer(mockRequest as any, invalidDto as any, "127.0.0.1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("exchange", () => {
    it("should successfully create an exchange", async () => {
      const mockRequest = { user: { sub: "user-123" } };
      const exchangeDto = {
        from_account_id: "usd-account",
        to_account_id: "eur-account",
        from_amount: 100,
        exchange_rate: 0.92,
      };

      const expectedResult = {
        id: "tx-456",
        from_account_id: exchangeDto.from_account_id,
        to_account_id: exchangeDto.to_account_id,
        amount: 100,
        currency: "USD",
        type: "EXCHANGE",
        status: "COMPLETED",
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockTransactionsService.exchange.mockResolvedValue(expectedResult);

      const result = await controller.exchange(
        mockRequest as any,
        exchangeDto,
        "127.0.0.1",
      );

      expect(result).toEqual(expectedResult);
      expect(service.exchange).toHaveBeenCalledWith(
        "user-123",
        exchangeDto,
        "127.0.0.1",
      );
    });

    it("should reject invalid exchange rate", async () => {
      const mockRequest = { user: { sub: "user-123" } };
      const invalidDto = {
        from_account_id: "usd-account",
        to_account_id: "eur-account",
        from_amount: 100,
        exchange_rate: -0.92, // Invalid: negative
      };

      mockTransactionsService.exchange.mockRejectedValue(
        new BadRequestException("Exchange rate must be positive"),
      );

      await expect(
        controller.exchange(mockRequest as any, invalidDto as any, "127.0.0.1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getTransactionHistory", () => {
    it("should return paginated transaction history", async () => {
      const mockRequest = { user: { sub: "user-123" } };
      const expectedResult = {
        data: [
          {
            id: "tx-1",
            type: "TRANSFER",
            amount: 100,
            currency: "USD",
            status: "COMPLETED",
            created_at: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockTransactionsService.getUserTransactionHistory.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.getTransactionHistory(
        mockRequest as any,
        1,
        20,
        undefined,
      );

      expect(result).toEqual(expectedResult);
      expect(service.getUserTransactionHistory).toHaveBeenCalledWith(
        "user-123",
        1,
        20,
        undefined,
      );
    });

    it("should filter by transaction type", async () => {
      const mockRequest = { user: { sub: "user-123" } };
      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      mockTransactionsService.getUserTransactionHistory.mockResolvedValue(
        expectedResult,
      );

      await controller.getTransactionHistory(
        mockRequest as any,
        1,
        20,
        "EXCHANGE" as any,
      );

      expect(service.getUserTransactionHistory).toHaveBeenCalledWith(
        "user-123",
        1,
        20,
        "EXCHANGE",
      );
    });
  });

  describe("getExchangeRates", () => {
    it("should return current exchange rates", async () => {
      const expectedRates = {
        USD_TO_EUR: 0.92,
        EUR_TO_USD: 1.087,
      };

      mockTransactionsService.getExchangeRates.mockResolvedValue(expectedRates);

      const result = await controller.getExchangeRates();

      expect(result).toEqual(expectedRates);
      expect(service.getExchangeRates).toHaveBeenCalled();
    });
  });
});
