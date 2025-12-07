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
    private transactionsRepository: TransactionsRepository
  ) {}

  private async applyLedgerAndBalances(
    client: PoolClient,
    ledgerEntries: LedgerEntryInput[]
  ): Promise<void> {
    // Create ledger entries inside same db transaction using LedgerService
    await this.ledgerService.createLedgerEntries(ledgerEntries, client);

    // Update account balances from ledger in the same transaction
    const affectedAccountIds = [
      ...new Set(ledgerEntries.map((e) => e.account_id)),
    ];

    for (const accountId of affectedAccountIds) {
      const balance =
        await this.ledgerRepository.calculateAccountBalance(accountId);
      await this.accountsRepository.updateAccountBalance(
        client,
        accountId,
        balance
      );
    }
  }

  private async findTransactionByIdempotencyKey(
    client: PoolClient,
    idempotencyKey: string
  ): Promise<Transaction | null> {
    return this.transactionsRepository.findByIdempotencyKey(
      client,
      idempotencyKey
    );
  }

  async transfer(
    userId: string,
    transferDto: TransferDto,
    ipAddress?: string
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

    const transaction = await withTransaction<Transaction>(async (client) => {
      if (idempotency_key) {
        const existing = await this.findTransactionByIdempotencyKey(
          client,
          idempotency_key
        );
        if (existing) {
          return existing;
        }
      }

      const fromAccount = await this.accountsRepository.lockUserAccount(
        client,
        from_account_id,
        userId
      );

      const toAccount = await this.accountsRepository.lockAccount(
        client,
        to_account_id
      );

      if (fromAccount.currency !== toAccount.currency) {
        throw new BadRequestException(
          "Cannot transfer between different currencies. Use exchange instead."
        );
      }

      const fromBalance = fromAccount.balance as number;
      if (fromBalance < amount) {
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
          description: description || `Transfer to ${toAccount.user_id}`,
        },
        {
          transaction_id: transactionId,
          account_id: to_account_id,
          amount: amount,
          description: description || `Transfer from ${fromAccount.user_id}`,
        },
      ];

      await this.applyLedgerAndBalances(client, ledgerEntries);

      const created = await this.transactionsRepository.findById(transactionId);
      if (!created) {
        throw new NotFoundException("Transaction not found after creation");
      }
      return created;
    }).catch(async (error) => {
      if (idempotency_key && (error as DatabaseError).code === "23505") {
        this.logger.warn(
          `Idempotency conflict on transfer with key ${idempotency_key}, attempting to load existing transaction`
        );
        const client = await db.getPool().connect();
        try {
          const existing = await this.findTransactionByIdempotencyKey(
            client,
            idempotency_key
          );
          if (existing) {
            return existing;
          }

          this.logger.error(
            `Idempotency key ${idempotency_key} raised 23505 but no transaction was found`
          );
          throw new BadRequestException(
            "Unable to safely retry this transfer; please use a new idempotency key."
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

    const updatedFromAccount = await this.accountsService.getAccountById(
      from_account_id,
      userId
    );
    const updatedToAccount = await this.accountsService.getAccountById(
      to_account_id,
      updatedFromAccount.user_id
    );

    this.balanceGateway.emitBalanceUpdate({
      accountId: from_account_id,
      newBalance: updatedFromAccount.balance,
      currency: updatedFromAccount.currency,
      userId: updatedFromAccount.user_id,
      timestamp: new Date(),
    });

    this.balanceGateway.emitBalanceUpdate({
      accountId: to_account_id,
      newBalance: updatedToAccount.balance,
      currency: updatedToAccount.currency,
      userId: updatedToAccount.user_id,
      timestamp: new Date(),
    });

    this.balanceGateway.emitTransactionNotification(userId, transaction);
    if (updatedToAccount.user_id !== userId) {
      this.balanceGateway.emitTransactionNotification(
        updatedToAccount.user_id,
        transaction
      );
    }

    return transaction;
  }

  async exchange(
    userId: string,
    exchangeDto: ExchangeDto,
    ipAddress?: string
  ): Promise<Transaction> {
    const {
      from_account_id,
      to_account_id,
      from_amount,
      exchange_rate,
      description,
      idempotency_key,
    } = exchangeDto;

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

    const transaction = await withTransaction<Transaction>(async (client) => {
      if (idempotency_key) {
        const existing = await this.findTransactionByIdempotencyKey(
          client,
          idempotency_key
        );
        if (existing) {
          return existing;
        }
      }

      const fromAccount = await this.accountsRepository.lockUserAccount(
        client,
        from_account_id,
        userId
      );

      const toAccount = await this.accountsRepository.lockUserAccount(
        client,
        to_account_id,
        userId
      );

      if (fromAccount.currency === toAccount.currency) {
        throw new BadRequestException(
          "Cannot exchange between same currencies. Use transfer instead."
        );
      }

      const fromBalance = fromAccount.balance as number;
      if (fromBalance < from_amount) {
        throw new BadRequestException("Insufficient balance");
      }

      const to_amount = Math.round(from_amount * exchange_rate * 100) / 100;

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
          description: `Exchange: ${from_amount} ${fromAccount.currency} → ${to_amount} ${toAccount.currency}`,
        },
        {
          transaction_id: transactionId,
          account_id: to_account_id,
          amount: to_amount,
          description: `Exchange: ${from_amount} ${fromAccount.currency} → ${to_amount} ${toAccount.currency}`,
        },
      ];

      await this.applyLedgerAndBalances(client, ledgerEntries);

      const created = await this.transactionsRepository.findById(transactionId);
      if (!created) {
        throw new NotFoundException("Transaction not found after creation");
      }
      return created;
    }).catch(async (error) => {
      if (idempotency_key && (error as DatabaseError).code === "23505") {
        this.logger.warn(
          `Idempotency conflict on exchange with key ${idempotency_key}, attempting to load existing transaction`
        );
        const client = await db.getPool().connect();
        try {
          const existing = await this.findTransactionByIdempotencyKey(
            client,
            idempotency_key
          );
          if (existing) {
            return existing;
          }

          this.logger.error(
            `Idempotency key ${idempotency_key} raised 23505 but no transaction was found`
          );
          throw new BadRequestException(
            "Unable to safely retry this exchange; please use a new idempotency key."
          );
        } finally {
          client.release();
        }
      }
      throw error;
    });

    const to_amount = Math.round(from_amount * exchange_rate * 100) / 100;

    await this.auditLogService.log({
      user_id: userId,
      action: "EXCHANGE",
      resource_type: "TRANSACTION",
      resource_id: transactionId,
      details: {
        from_amount,
        to_amount,
        from_currency: transaction.currency,
        to_currency: undefined,
        exchange_rate,
        from_account_id,
        to_account_id,
      },
      ip_address: ipAddress,
    });

    const updatedFromAccount = await this.accountsService.getAccountById(
      from_account_id,
      userId
    );
    const updatedToAccount = await this.accountsService.getAccountById(
      to_account_id,
      userId
    );

    this.balanceGateway.emitBalanceUpdate({
      accountId: from_account_id,
      newBalance: updatedFromAccount.balance,
      currency: updatedFromAccount.currency,
      userId: updatedFromAccount.user_id,
      timestamp: new Date(),
    });

    this.balanceGateway.emitBalanceUpdate({
      accountId: to_account_id,
      newBalance: updatedToAccount.balance,
      currency: updatedToAccount.currency,
      userId: updatedToAccount.user_id,
      timestamp: new Date(),
    });

    this.balanceGateway.emitTransactionNotification(userId, transaction);

    return transaction;
  }

  async getUserTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: TransactionType
  ): Promise<PagedResult<Transaction>> {
    return this.transactionsRepository.getUserTransactionHistory(
      userId,
      page,
      limit,
      type
    );
  }

  async getExchangeRates(): Promise<{
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  }> {
    // Fixed rates as per requirements: 1 USD = 0.92 EUR
    const USD_TO_EUR = 0.92;
    const EUR_TO_USD = Math.round((1 / USD_TO_EUR) * 10000) / 10000;

    return {
      USD_TO_EUR,
      EUR_TO_USD,
    };
  }
}
