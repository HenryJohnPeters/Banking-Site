import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { db } from "../../shared/database/client";
import {
  Transaction,
  TransactionType,
  TransferDto,
  ExchangeDto,
  PagedResult,
} from "../../models/Transaction";
import { AccountsService } from "../accounts/accounts.service";
import { LedgerService } from "../ledger/ledger.service";
import { AuditLogService } from "../../shared/audit.service";
import { BalanceGateway } from "../../shared/gateways/balance.gateway";
import { LedgerEntryInput } from "../../models/Ledger";
import { v4 as uuidv4 } from "uuid";
import { PoolClient, DatabaseError } from "pg";
import { AccountsRepository } from "../accounts/accounts.repository";
import { LedgerRepository } from "../ledger/ledger.repository";
import { TransactionsRepository } from "./transactions.repository";
import { withTransaction } from "../../shared/database/transaction";
import Decimal from "decimal.js";
import { EXCHANGE_RATES, PAGINATION } from "../../shared/constants";

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private accountsService: AccountsService,
    private ledgerService: LedgerService,
    private auditLogService: AuditLogService,
    private balanceGateway: BalanceGateway,
    private accountsRepository: AccountsRepository,
    private ledgerRepository: LedgerRepository,
    private transactionsRepository: TransactionsRepository,
  ) {}

  private async applyLedgerAndBalances(
    client: PoolClient,
    ledgerEntries: LedgerEntryInput[],
  ): Promise<void> {
    // Create ledger entries inside same db transaction using LedgerService
    await this.ledgerService.createLedgerEntries(ledgerEntries, client);

    // Update account balances from ledger in the same transaction
    const affectedAccountIds = [
      ...new Set(ledgerEntries.map((e) => e.account_id)),
    ];

    for (const accountId of affectedAccountIds) {
      const balance = await this.ledgerRepository.calculateAccountBalance(
        accountId,
        client,
      );
      await this.accountsRepository.updateAccountBalance(
        client,
        accountId,
        balance,
      );
    }
  }

  private async findTransactionByIdempotencyKey(
    client: PoolClient,
    idempotencyKey: string,
  ): Promise<Transaction | null> {
    return this.transactionsRepository.findByIdempotencyKey(
      client,
      idempotencyKey,
    );
  }

  // Helper to get updated balances within the same transaction
  private async getUpdatedBalancesInTransaction(
    client: PoolClient,
    accountIds: string[],
  ): Promise<
    Map<string, { balance: number; currency: string; userId: string }>
  > {
    const balances = new Map();

    for (const accountId of accountIds) {
      const result = await client.query(
        "SELECT id, user_id, currency, balance FROM accounts WHERE id = $1",
        [accountId],
      );
      if (result.rows.length > 0) {
        const account = result.rows[0];
        balances.set(accountId, {
          balance: parseFloat(account.balance),
          currency: account.currency,
          userId: account.user_id,
        });
      }
    }

    return balances;
  }

  async transfer(
    userId: string,
    transferDto: TransferDto,
    ipAddress?: string,
  ): Promise<Transaction> {
    const {
      from_account_id,
      to_account_id,
      amount,
      description,
      idempotency_key,
    } = transferDto;

    if (amount <= 0) {
      throw new BadRequestException("Transfer amount must be positive");
    }

    if (from_account_id === to_account_id) {
      throw new BadRequestException("Cannot transfer to the same account");
    }

    const transactionId = uuidv4();
    let updatedBalances: Map<
      string,
      { balance: number; currency: string; userId: string }
    >;

    const transaction = await withTransaction<Transaction>(async (client) => {
      if (idempotency_key) {
        const existing = await this.findTransactionByIdempotencyKey(
          client,
          idempotency_key,
        );
        if (existing) {
          return existing;
        }
      }

      // Lock accounts in deterministic order to prevent deadlocks
      const accountsToLock = [from_account_id, to_account_id].sort();

      this.logger.debug(
        `Locking accounts in order: ${accountsToLock[0]}, ${accountsToLock[1]}`,
      );

      // Lock both accounts in sorted order
      const account1 = await this.accountsRepository.lockUserAccount(
        client,
        accountsToLock[0],
        userId,
      );
      const account2 = await this.accountsRepository.lockAccount(
        client,
        accountsToLock[1],
      );

      // Identify which is from/to after locking
      const fromAccount = account1.id === from_account_id ? account1 : account2;
      const toAccount = account1.id === to_account_id ? account1 : account2;

      if (fromAccount.currency !== toAccount.currency) {
        throw new BadRequestException(
          "Cannot transfer between different currencies. Use exchange instead.",
        );
      }

      // Use Decimal.js for precise financial calculations
      const fromBalance = new Decimal(fromAccount.balance as number);
      const transferAmount = new Decimal(amount);

      // Strict balance check - no tolerance for overdraft
      if (fromBalance.lessThan(transferAmount)) {
        throw new BadRequestException("Insufficient balance");
      }

      await this.transactionsRepository.insertTransfer(client, {
        id: transactionId,
        fromAccountId: from_account_id,
        toAccountId: to_account_id,
        amount,
        currency: fromAccount.currency,
        description: description || `Transfer to ${toAccount.user_id}`,
        idempotencyKey: idempotency_key ?? null,
      });

      const ledgerEntries: LedgerEntryInput[] = [
        {
          transaction_id: transactionId,
          account_id: from_account_id,
          amount: -amount,
          type: "DEBIT",
          description: description || `Transfer to ${toAccount.user_id}`,
        },
        {
          transaction_id: transactionId,
          account_id: to_account_id,
          amount: amount,
          type: "CREDIT",
          description: description || `Transfer from ${fromAccount.user_id}`,
        },
      ];

      await this.applyLedgerAndBalances(client, ledgerEntries);

      // FIX #6: Get updated balances WITHIN the transaction to avoid race conditions
      updatedBalances = await this.getUpdatedBalancesInTransaction(client, [
        from_account_id,
        to_account_id,
      ]);

      const created = await this.transactionsRepository.findById(
        transactionId,
        client,
      );
      if (!created) {
        throw new NotFoundException("Transaction not found after creation");
      }
      return created;
    }).catch(async (error) => {
      // Deadlock detection
      if ((error as DatabaseError).code === "40P01") {
        this.logger.warn(
          `Deadlock detected on transfer, will be retried by caller`,
        );
        throw new BadRequestException(
          "Transaction conflict detected. Please retry.",
        );
      }

      if (idempotency_key && (error as DatabaseError).code === "23505") {
        this.logger.warn(
          `Idempotency conflict on transfer with key ${idempotency_key}, attempting to load existing transaction`,
        );
        const client = await db.getPool().connect();
        try {
          const existing = await this.findTransactionByIdempotencyKey(
            client,
            idempotency_key,
          );
          if (existing) {
            return existing;
          }

          this.logger.error(
            `Idempotency key ${idempotency_key} raised 23505 but no transaction was found`,
          );
          throw new BadRequestException(
            "Unable to safely retry this transfer; please use a new idempotency key.",
          );
        } finally {
          client.release();
        }
      }
      throw error;
    });

    await this.auditLogService.log({
      user_id: userId,
      action: "TRANSFER",
      resource_type: "TRANSACTION",
      resource_id: transactionId,
      details: {
        amount,
        currency: transaction.currency,
        from_account_id,
        to_account_id,
        description,
      },
      ip_address: ipAddress,
    });

    // Use the balances captured within the transaction (may be undefined for cached transactions)
    if (updatedBalances) {
      const fromAccountBalance = updatedBalances.get(from_account_id);
      const toAccountBalance = updatedBalances.get(to_account_id);

      if (fromAccountBalance) {
        this.balanceGateway.emitBalanceUpdate({
          accountId: from_account_id,
          newBalance: fromAccountBalance.balance,
          currency: fromAccountBalance.currency,
          userId: fromAccountBalance.userId,
          timestamp: new Date(),
        });
      }

      if (toAccountBalance) {
        this.balanceGateway.emitBalanceUpdate({
          accountId: to_account_id,
          newBalance: toAccountBalance.balance,
          currency: toAccountBalance.currency,
          userId: toAccountBalance.userId,
          timestamp: new Date(),
        });

        this.balanceGateway.emitTransactionNotification(userId, transaction);
        if (toAccountBalance.userId !== userId) {
          this.balanceGateway.emitTransactionNotification(
            toAccountBalance.userId,
            transaction,
          );
        }
      }
    }

    return transaction;
  }

  async exchange(
    userId: string,
    exchangeDto: ExchangeDto,
    ipAddress?: string,
  ): Promise<Transaction> {
    const {
      from_account_id,
      to_account_id,
      from_amount,
      exchange_rate,
      description,
      idempotency_key,
    } = exchangeDto;

    this.logger.debug(
      `Exchange request from user ${userId}: from=${from_account_id}, to=${to_account_id}, amount=${from_amount}`,
    );

    if (from_amount <= 0) {
      throw new BadRequestException("Exchange amount must be positive");
    }

    if (exchange_rate <= 0) {
      throw new BadRequestException("Exchange rate must be positive");
    }

    if (from_account_id === to_account_id) {
      throw new BadRequestException("Cannot exchange with the same account");
    }

    const transactionId = uuidv4();
    let updatedBalances: Map<
      string,
      { balance: number; currency: string; userId: string }
    >;

    const transaction = await withTransaction<Transaction>(async (client) => {
      if (idempotency_key) {
        const existing = await this.findTransactionByIdempotencyKey(
          client,
          idempotency_key,
        );
        if (existing) {
          return existing;
        }
      }

      // FIX #11: Lock accounts in deterministic order to prevent deadlocks
      const accountsToLock = [from_account_id, to_account_id].sort();

      this.logger.debug(
        `Locking accounts in order: ${accountsToLock[0]}, ${accountsToLock[1]}`,
      );

      // Lock both accounts in sorted order
      const account1 = await this.accountsRepository.lockUserAccount(
        client,
        accountsToLock[0],
        userId,
      );
      const account2 = await this.accountsRepository.lockUserAccount(
        client,
        accountsToLock[1],
        userId,
      );

      // Identify which is from/to
      const fromAccount = account1.id === from_account_id ? account1 : account2;
      const toAccount = account1.id === to_account_id ? account1 : account2;

      if (fromAccount.currency === toAccount.currency) {
        throw new BadRequestException(
          "Cannot exchange between same currencies. Use transfer instead.",
        );
      }

      // Use Decimal.js for precise currency exchange calculations
      const fromBalance = new Decimal(fromAccount.balance as number);
      const fromAmountDecimal = new Decimal(from_amount);
      const exchangeRateDecimal = new Decimal(exchange_rate);

      // Strict balance check
      if (fromBalance.lessThan(fromAmountDecimal)) {
        throw new BadRequestException("Insufficient balance");
      }

      // Precise calculation with proper rounding (2 decimal places for currency)
      const toAmountDecimal = fromAmountDecimal
        .times(exchangeRateDecimal)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const to_amount = toAmountDecimal.toNumber();

      await this.transactionsRepository.insertExchange(client, {
        id: transactionId,
        fromAccountId: from_account_id,
        toAccountId: to_account_id,
        fromAmount: from_amount,
        fromCurrency: fromAccount.currency,
        toAmount: to_amount,
        toCurrency: toAccount.currency,
        description:
          description ||
          `Exchange ${from_amount} ${fromAccount.currency} to ${to_amount} ${toAccount.currency}`,
        idempotencyKey: idempotency_key ?? null,
      });

      const ledgerEntries: LedgerEntryInput[] = [
        {
          transaction_id: transactionId,
          account_id: from_account_id,
          amount: -from_amount,
          type: "DEBIT",
          description: `Exchange: ${from_amount} ${fromAccount.currency} → ${to_amount} ${toAccount.currency}`,
        },
        {
          transaction_id: transactionId,
          account_id: to_account_id,
          amount: to_amount,
          type: "CREDIT",
          description: `Exchange: ${from_amount} ${fromAccount.currency} → ${to_amount} ${toAccount.currency}`,
        },
      ];

      await this.ledgerService.createCrossLedgerEntries(ledgerEntries, client);

      const affectedAccountIds = [from_account_id, to_account_id];
      for (const accountId of affectedAccountIds) {
        const balance = await this.ledgerRepository.calculateAccountBalance(
          accountId,
          client,
        );
        await this.accountsRepository.updateAccountBalance(
          client,
          accountId,
          balance,
        );
      }

      // FIX #6: Get balances within transaction
      updatedBalances = await this.getUpdatedBalancesInTransaction(client, [
        from_account_id,
        to_account_id,
      ]);

      const created = await this.transactionsRepository.findById(
        transactionId,
        client,
      );
      if (!created) {
        throw new NotFoundException("Transaction not found after creation");
      }
      return created;
    }).catch(async (error) => {
      if ((error as DatabaseError).code === "40P01") {
        this.logger.warn(
          `Deadlock detected on exchange, will be retried by caller`,
        );
        throw new BadRequestException(
          "Transaction conflict detected. Please retry.",
        );
      }

      if (idempotency_key && (error as DatabaseError).code === "23505") {
        this.logger.warn(
          `Idempotency conflict on exchange with key ${idempotency_key}, attempting to load existing transaction`,
        );
        const client = await db.getPool().connect();
        try {
          const existing = await this.findTransactionByIdempotencyKey(
            client,
            idempotency_key,
          );
          if (existing) {
            return existing;
          }

          this.logger.error(
            `Idempotency key ${idempotency_key} raised 23505 but no transaction was found`,
          );
          throw new BadRequestException(
            "Unable to safely retry this exchange; please use a new idempotency key.",
          );
        } finally {
          client.release();
        }
      }
      throw error;
    });

    await this.auditLogService.log({
      user_id: userId,
      action: "EXCHANGE",
      resource_type: "TRANSACTION",
      resource_id: transactionId,
      details: {
        from_amount,
        to_amount: new Decimal(from_amount)
          .times(exchange_rate)
          .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
          .toNumber(),
        from_currency: transaction.currency,
        to_currency: undefined,
        exchange_rate,
        from_account_id,
        to_account_id,
      },
      ip_address: ipAddress,
    });

    // Use balances captured within transaction
    const fromAccountBalance = updatedBalances.get(from_account_id);
    const toAccountBalance = updatedBalances.get(to_account_id);

    if (fromAccountBalance) {
      this.balanceGateway.emitBalanceUpdate({
        accountId: from_account_id,
        newBalance: fromAccountBalance.balance,
        currency: fromAccountBalance.currency,
        userId: fromAccountBalance.userId,
        timestamp: new Date(),
      });
    }

    if (toAccountBalance) {
      this.balanceGateway.emitBalanceUpdate({
        accountId: to_account_id,
        newBalance: toAccountBalance.balance,
        currency: toAccountBalance.currency,
        userId: toAccountBalance.userId,
        timestamp: new Date(),
      });
    }

    this.balanceGateway.emitTransactionNotification(userId, transaction);

    return transaction;
  }

  async getUserTransactionHistory(
    userId: string,
    page: number = PAGINATION.DEFAULT_PAGE,
    limit: number = PAGINATION.DEFAULT_LIMIT,
    type?: TransactionType,
  ): Promise<PagedResult<Transaction>> {
    return this.transactionsRepository.getUserTransactionHistory(
      userId,
      page,
      limit,
      type,
    );
  }

  async getExchangeRates(): Promise<{
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  }> {
    return {
      USD_TO_EUR: EXCHANGE_RATES.USD_TO_EUR,
      EUR_TO_USD: EXCHANGE_RATES.EUR_TO_USD,
    };
  }
}
