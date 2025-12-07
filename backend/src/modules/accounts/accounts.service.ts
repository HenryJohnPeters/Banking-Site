import { Injectable } from "@nestjs/common";
import { Account, Currency } from "../../models/Account";
import { Transaction, PagedResult } from "../../models/Transaction";
import { AccountsRepository } from "./accounts.repository";

@Injectable()
export class AccountsService {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  async getUserAccounts(userId: string): Promise<Account[]> {
    return this.accountsRepository.findUserAccounts(userId);
  }

  async getAccountById(accountId: string, userId: string): Promise<Account> {
    return this.accountsRepository.findUserAccountById(accountId, userId);
  }

  async getAccountBalance(
    accountId: string,
    userId: string
  ): Promise<{ balance: number; currency: Currency }> {
    const account = await this.getAccountById(accountId, userId);
    return {
      balance: account.balance,
      currency: account.currency,
    };
  }

  async getAccountTransactions(
    accountId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PagedResult<Transaction>> {
    return this.accountsRepository.getAccountTransactions(
      accountId,
      userId,
      page,
      limit
    );
  }

  async updateAccountBalance(
    accountId: string,
    newBalance: number
  ): Promise<void> {
    // Keep a non-transactional helper for cases where we just need to update via the pool
    // The repository method will choose the correct executor
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { db } = require("../../shared/database/client");
    await this.accountsRepository.updateAccountBalance(
      db,
      accountId,
      newBalance
    );
  }

  async verifyAccountBalance(accountId: string): Promise<{
    isConsistent: boolean;
    ledgerBalance: number;
    accountBalance: number;
  }> {
    return this.accountsRepository.verifyAccountBalance(accountId);
  }
}
