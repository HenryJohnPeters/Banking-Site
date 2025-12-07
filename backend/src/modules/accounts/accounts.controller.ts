import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AccountsService } from "./accounts.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("Accounts")
@ApiBearerAuth()
@Controller("accounts")
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  @ApiOperation({
    summary: "Get user accounts",
    description:
      "Retrieve all accounts (USD and EUR) for the authenticated user with current balances",
  })
  @ApiResponse({
    status: 200,
    description: "Accounts retrieved successfully",
    schema: {
      example: [
        {
          id: "uuid",
          user_id: "uuid",
          currency: "USD",
          balance: 1000.0,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
        {
          id: "uuid",
          user_id: "uuid",
          currency: "EUR",
          balance: 500.0,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUserAccounts(@Request() req) {
    return this.accountsService.getUserAccounts(req.user.id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get account details",
    description: "Retrieve detailed information for a specific account",
  })
  @ApiParam({
    name: "id",
    description: "Account UUID",
    type: String,
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @ApiResponse({
    status: 200,
    description: "Account details retrieved successfully",
    schema: {
      example: {
        id: "uuid",
        user_id: "uuid",
        currency: "USD",
        balance: 1000.0,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Account not found or unauthorized",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getAccount(@Param("id") accountId: string, @Request() req) {
    return this.accountsService.getAccountById(accountId, req.user.id);
  }

  @Get(":id/balance")
  @ApiOperation({
    summary: "Get account balance",
    description: "Retrieve the current balance for a specific account",
  })
  @ApiParam({
    name: "id",
    description: "Account UUID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Balance retrieved successfully",
    schema: {
      example: {
        account_id: "uuid",
        currency: "USD",
        balance: 1000.0,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Account not found or unauthorized",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getAccountBalance(@Param("id") accountId: string, @Request() req) {
    return this.accountsService.getAccountBalance(accountId, req.user.id);
  }

  @Get(":id/transactions")
  @ApiOperation({
    summary: "Get account transactions",
    description:
      "Retrieve paginated transaction history for a specific account",
  })
  @ApiParam({
    name: "id",
    description: "Account UUID",
    type: String,
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
    description: "Items per page (default: 20)",
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: "Transactions retrieved successfully",
    schema: {
      example: {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Account not found or unauthorized",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getAccountTransactions(
    @Param("id") accountId: string,
    @Request() req,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "20"
  ) {
    return this.accountsService.getAccountTransactions(
      accountId,
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
  }

  @Get(":id/reconcile")
  @ApiOperation({
    summary: "Reconcile account balance",
    description:
      "Verify that the account balance matches the sum of ledger entries (integrity check)",
  })
  @ApiParam({
    name: "id",
    description: "Account UUID",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Reconciliation result",
    schema: {
      example: {
        account_id: "uuid",
        ledger_balance: 1000.0,
        account_balance: 1000.0,
        is_consistent: true,
        difference: 0.0,
      },
    },
  })
  @ApiResponse({ status: 404, description: "Account not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async reconcileAccountBalance(
    @Param("id") accountId: string,
    @Request() req
  ) {
    return this.accountsService.verifyAccountBalance(accountId);
  }
}
