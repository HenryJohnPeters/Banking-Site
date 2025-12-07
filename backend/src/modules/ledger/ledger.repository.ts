import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../../shared/database/client";
import {
  LedgerEntry,
  LedgerEntryInput,
  LedgerBalance,
} from "../../models/Ledger";

@Injectable()
export class LedgerRepository {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Creates a single ledger entry in the database
   */
  async createLedgerEntry(
    entry: LedgerEntryInput,
    client: PoolClient,
  ): Promise<LedgerEntry> {
    const query = `
      INSERT INTO ledger_entries (
        transaction_id, account_id, amount, type, description, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, transaction_id, account_id, amount, type, description, created_at
    `;

    const values = [
      entry.transaction_id,
      entry.account_id,
      entry.amount,
      entry.type,
      entry.description,
    ];

    const result = await client.query(query, values);
    return result.rows[0];
  }

  /**
   * Retrieves all ledger entries for a specific transaction
   */
  async getLedgerEntriesByTransaction(
    transactionId: string,
    client?: PoolClient,
  ): Promise<LedgerEntry[]> {
    const query = `
      SELECT id, transaction_id, account_id, amount, type, description, created_at
      FROM ledger_entries
      WHERE transaction_id = $1
      ORDER BY created_at ASC
    `;

    const dbClient = client || this.dbService.getPool();
    const result = await dbClient.query(query, [transactionId]);
    return result.rows;
  }

  /**
   * Calculates the current balance for a specific account based on ledger entries
   * This is the authoritative source of account balances
   */
  async calculateAccountBalance(
    accountId: string,
    client?: PoolClient,
  ): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as balance
      FROM ledger_entries
      WHERE account_id = $1
    `;

    const dbClient = client || this.dbService.getPool();
    const result = await dbClient.query(query, [accountId]);
    return parseFloat(result.rows[0].balance) || 0;
  }

  /**
   * Gets balance information for multiple accounts
   */
  async getAccountBalances(accountIds: string[]): Promise<LedgerBalance[]> {
    if (accountIds.length === 0) return [];

    const placeholders = accountIds
      .map((_, index) => `$${index + 1}`)
      .join(",");
    const query = `
      SELECT 
        account_id,
        COALESCE(SUM(amount), 0) as total_amount
      FROM ledger_entries
      WHERE account_id IN (${placeholders})
      GROUP BY account_id
    `;

    const result = await this.dbService.getPool().query(query, accountIds);
    return result.rows.map((row) => ({
      account_id: row.account_id,
      total_amount: parseFloat(row.total_amount),
    }));
  }

  /**
   * Gets the sum of ledger entries for each transaction to verify balance
   * Used for ledger integrity verification
   */
  async getTransactionBalances(): Promise<
    Array<{ transaction_id: string; total_amount: number }>
  > {
    const query = `
      SELECT 
        transaction_id,
        SUM(amount) as total_amount
      FROM ledger_entries
      GROUP BY transaction_id
      HAVING COUNT(*) >= 2
    `;

    const result = await this.dbService.getPool().query(query);
    return result.rows.map((row) => ({
      transaction_id: row.transaction_id,
      total_amount: parseFloat(row.total_amount),
    }));
  }

  /**
   * Compares stored account balances with calculated ledger balances
   * Used for integrity verification
   */
  async verifyAccountBalances(): Promise<
    Array<{
      account_id: string;
      stored_balance: number;
      calculated_balance: number;
    }>
  > {
    const query = `
      SELECT 
        a.id as account_id,
        a.balance as stored_balance,
        COALESCE(SUM(le.amount), 0) as calculated_balance
      FROM accounts a
      LEFT JOIN ledger_entries le ON le.account_id = a.id
      GROUP BY a.id, a.balance
      ORDER BY a.id
    `;

    const result = await this.dbService.getPool().query(query);
    return result.rows.map((row) => ({
      account_id: row.account_id,
      stored_balance: parseFloat(row.stored_balance),
      calculated_balance: parseFloat(row.calculated_balance),
    }));
  }

  /**
   * Gets ledger entries for a specific account with pagination
   */
  async getLedgerEntriesByAccount(
    accountId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<LedgerEntry[]> {
    const query = `
      SELECT id, transaction_id, account_id, amount, type, description, created_at
      FROM ledger_entries
      WHERE account_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.dbService
      .getPool()
      .query(query, [accountId, limit, offset]);
    return result.rows;
  }

  /**
   * Gets the count of ledger entries for a specific account
   */
  async getLedgerEntryCountByAccount(accountId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM ledger_entries
      WHERE account_id = $1
    `;

    const result = await this.dbService.getPool().query(query, [accountId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Gets recent ledger entries across all accounts for audit purposes
   */
  async getRecentLedgerEntries(
    limit: number = 100,
    offset: number = 0,
  ): Promise<Array<LedgerEntry & { currency: string }>> {
    const query = `
      SELECT 
        le.id, le.transaction_id, le.account_id, le.amount, le.type, le.description, le.created_at,
        a.currency
      FROM ledger_entries le
      JOIN accounts a ON a.id = le.account_id
      ORDER BY le.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.dbService.getPool().query(query, [limit, offset]);
    return result.rows;
  }

  /**
   * Gets all account balances with comparison between stored and calculated values
   * Expected by tests for balance verification
   */
  async getAllAccountBalances(): Promise<
    Array<{
      id: string;
      account_balance: number;
      ledger_balance: number;
    }>
  > {
    const query = `
      SELECT 
        a.id,
        a.balance as account_balance,
        COALESCE(SUM(le.amount), 0) as ledger_balance
      FROM accounts a
      LEFT JOIN ledger_entries le ON le.account_id = a.id
      GROUP BY a.id, a.balance
      ORDER BY a.id
    `;

    const result = await this.dbService.getPool().query(query);
    return result.rows.map((row) => ({
      id: row.id,
      account_balance: parseFloat(row.account_balance),
      ledger_balance: parseFloat(row.ledger_balance),
    }));
  }
}
