import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseEnumPipe,
  ValidationPipe,
  UsePipes,
  Ip,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TransactionsService } from "./transactions.service";
import { LedgerService } from "../ledger/ledger.service";
import {
  TransferDto,
  ExchangeDto,
  Transaction,
  TransactionType,
  PagedResult,
} from "../../models/Transaction";
import { EXCHANGE_RATES } from "../../shared/constants";

@ApiTags("Transactions")
@Controller("transactions")
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly ledgerService: LedgerService,
  ) {}

  @Post("transfer")
  @ApiOperation({
    summary: "Transfer funds between accounts",
    description:
      "Transfer money from one account to another within the same currency. Implements double-entry bookkeeping with automatic balance updates.",
  })
  @ApiBody({
    type: TransferDto,
    description: "Transfer details including accounts and amount",
    examples: {
      example1: {
        summary: "USD Transfer",
        description: "Transfer $100 USD between accounts",
        value: {
          from_account_id: "550e8400-e29b-41d4-a716-446655440000",
          to_account_id: "550e8400-e29b-41d4-a716-446655440001",
          amount: 100.0,
          description: "Payment for services",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Transfer completed successfully",
    schema: {
      example: {
        id: "uuid",
        from_account_id: "uuid",
        to_account_id: "uuid",
        amount: 100.0,
        currency: "USD",
        type: "TRANSFER",
        status: "COMPLETED",
        description: "Payment for services",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - insufficient funds, invalid amount, or currency mismatch",
    schema: {
      example: {
        statusCode: 400,
        message: "Insufficient balance",
        error: "Bad Request",
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Account not found or unauthorized",
    schema: {
      example: {
        statusCode: 404,
        message: "Source account not found or unauthorized",
        error: "Not Found",
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async transfer(
    @Request() req: { user: { sub: string } },
    @Body() transferDto: TransferDto,
    @Ip() ipAddress: string,
  ): Promise<Transaction> {
    return this.transactionsService.transfer(
      req.user.sub,
      transferDto,
      ipAddress,
    );
  }

  @Post("exchange")
  @ApiOperation({
    summary: "Exchange currency between user accounts",
    description: `Exchange money between USD and EUR accounts for the same user. Uses fixed exchange rate: 1 USD = ${EXCHANGE_RATES.USD_TO_EUR} EUR`,
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        from_account_id: {
          type: "string",
          format: "uuid",
          description: "Source account ID (must belong to user)",
        },
        to_account_id: {
          type: "string",
          format: "uuid",
          description: "Destination account ID (must belong to user)",
        },
        from_amount: { type: "number", example: 100.0 },
        exchange_rate: { type: "number", example: EXCHANGE_RATES.USD_TO_EUR },
        description: { type: "string", example: "Convert to EUR" },
        idempotency_key: {
          type: "string",
          example: "exchange-unique-key-123",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Currency exchange completed successfully",
    schema: {
      example: {
        id: "uuid",
        from_account_id: "uuid",
        to_account_id: "uuid",
        amount: 92.0,
        currency: "EUR",
        type: "EXCHANGE",
        status: "COMPLETED",
        description: "Currency exchange",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad request - insufficient funds, same currency, or invalid rate",
  })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async exchange(
    @Request() req: { user: { sub: string } },
    @Body() exchangeDto: ExchangeDto,
    @Ip() ipAddress: string,
  ): Promise<Transaction> {
    return this.transactionsService.exchange(
      req.user.sub,
      exchangeDto,
      ipAddress,
    );
  }

  @Get()
  @ApiOperation({
    summary: "Get user transaction history",
    description:
      "Retrieve paginated list of user's transactions with optional filtering by transaction type",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 20, max: 100)",
    example: 20,
  })
  @ApiQuery({
    name: "type",
    required: false,
    enum: TransactionType,
    description: "Filter by transaction type",
    example: TransactionType.TRANSFER,
  })
  @ApiResponse({
    status: 200,
    description: "Transaction history retrieved successfully",
    schema: {
      example: {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      },
    },
  })
  async getTransactionHistory(
    @Request() req: { user: { sub: string } },
    @Query("page", new ParseIntPipe({ optional: true })) page: number = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number = 20,
    @Query("type", new ParseEnumPipe(TransactionType, { optional: true }))
    type?: TransactionType,
  ): Promise<PagedResult<Transaction>> {
    // Limit maximum page size
    const maxLimit = Math.min(limit, 100);
    return this.transactionsService.getUserTransactionHistory(
      req.user.sub,
      page,
      maxLimit,
      type,
    );
  }

  @Get("exchange-rates")
  @ApiOperation({
    summary: "Get current exchange rates",
    description: "Returns the current exchange rates between USD and EUR",
  })
  @ApiResponse({
    status: 200,
    description: "Current exchange rates",
    schema: {
      type: "object",
      properties: {
        USD_TO_EUR: { type: "number", example: EXCHANGE_RATES.USD_TO_EUR },
        EUR_TO_USD: { type: "number", example: EXCHANGE_RATES.EUR_TO_USD },
      },
    },
  })
  async getExchangeRates(): Promise<{
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  }> {
    return this.transactionsService.getExchangeRates();
  }

  @Get("verify-integrity")
  @ApiOperation({
    summary: "Verify ledger integrity",
    description:
      "Administrative endpoint to verify double-entry bookkeeping integrity and account balance consistency. Delegates to LedgerService for comprehensive verification.",
  })
  @ApiResponse({
    status: 200,
    description: "Integrity verification results",
    schema: {
      example: {
        isValid: true,
        errors: [],
        summary: {
          totalTransactions: 150,
          balancedTransactions: 150,
          unbalancedTransactions: 0,
          totalAccounts: 10,
          consistentAccounts: 10,
          inconsistentAccounts: 0,
        },
      },
    },
  })
  async verifyIntegrity() {
    // Delegate to LedgerService for proper separation of concerns
    return this.ledgerService.verifyLedgerIntegrity();
  }
}
