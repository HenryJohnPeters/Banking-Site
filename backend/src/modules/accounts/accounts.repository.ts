import { Injectable, NotFoundException } from "@nestjs/common";
import { db } from "../../shared/database/client";
import { PoolClient } from "pg";
import { Account } from "../../models/Account";
import { Transaction, PagedResult } from "../../models/Transaction";

@Injectable()
export class AccountsRepository {
  async findUserAccounts(userId: string): Promise<Account[]> {
    const result = await db.query(
      `SELECT * FROM accounts WHERE user_id = $1 ORDER BY currency`,
      [userId]
    );
    return result.rows;
  }

  async findUserAccountById(
    accountId: string,
    userId: string
  ): Promise<Account> {
    const result = await db.query(
      `SELECT * FROM accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException("Account not found");
    }

    return result.rows[0];
  }

  async lockUserAccount(
    client: PoolClient,
    accountId: string,
    userId: string
  ): Promise<Account> {
    const result = await client.query(
      `SELECT id, user_id, currency, balance 
       FROM accounts 
       WHERE id = $1 AND user_id = $2 
       FOR UPDATE`,
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException("Account not found or unauthorized");
    }

    return result.rows[0];
  }

  async lockAccount(client: PoolClient, accountId: string): Promise<Account> {
    const result = await client.query(
      `SELECT id, user_id, currency, balance 
       FROM accounts 
       WHERE id = $1 
       FOR UPDATE`,
      [accountId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException("Account not found");
    }

    return result.rows[0];
  }

  async updateAccountBalance(
    clientOrDb: PoolClient | typeof db,
    accountId: string,
    newBalance: number
  ): Promise<void> {
    const executor: any = "query" in clientOrDb ? clientOrDb : db;
    await executor.query(
      "UPDATE accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newBalance, accountId]
    );
  }

  async getAccountTransactions(
    accountId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PagedResult<Transaction>> {
    // Verify account belongs to user
    await this.findUserAccountById(accountId, userId);

    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT * FROM transactions 
       WHERE (from_account_id = $1 OR to_account_id = $1)
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM transactions 
       WHERE (from_account_id = $1 OR to_account_id = $1)`,
      [accountId]
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows,
      total,
      page,
      limit,
    };
  }

  async verifyAccountBalance(accountId: string): Promise<{
    isConsistent: boolean;
    ledgerBalance: number;
    accountBalance: number;
  }> {
    const result = await db.query(
      `SELECT 
         a.balance as account_balance,
         COALESCE(SUM(l.amount), 0) as ledger_balance
       FROM accounts a
       LEFT JOIN ledger_entries l ON a.id = l.account_id
       WHERE a.id = $1
       GROUP BY a.id, a.balance`,
      [accountId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException("Account not found");
    }

    const { account_balance, ledger_balance } = result.rows[0];
    const accountBalance = parseFloat(account_balance);
    const calculatedBalance = parseFloat(ledger_balance);

    return {
      isConsistent: Math.abs(accountBalance - calculatedBalance) < 0.01,
      ledgerBalance: calculatedBalance,
      accountBalance: accountBalance,
    };
  }
}
