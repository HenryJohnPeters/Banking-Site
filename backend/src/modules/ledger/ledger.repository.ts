import { Injectable } from "@nestjs/common";
import { db } from "../../shared/database/client";
import { PoolClient } from "pg";
import { LedgerEntry } from "../../models/Ledger";

@Injectable()
export class LedgerRepository {
  async insertEntry(
    client: PoolClient,
    data: {
      transactionId: string;
      accountId: string;
      amount: number;
      description: string;
    }
  ): Promise<void> {
    await client.query(
      `INSERT INTO ledger_entries (transaction_id, account_id, amount, description) 
       VALUES ($1, $2, $3, $4)`,
      [data.transactionId, data.accountId, data.amount, data.description]
    );
  }

  async getEntriesByTransaction(transactionId: string): Promise<LedgerEntry[]> {
    const result = await db.query(
      `SELECT * FROM ledger_entries WHERE transaction_id = $1 ORDER BY created_at`,
      [transactionId]
    );
    return result.rows;
  }

  async getEntriesByAccount(
    accountId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ entries: LedgerEntry[]; total: number }> {
    const offset = (page - 1) * limit;

    const [entriesResult, countResult] = await Promise.all([
      db.query(
        `SELECT l.*, t.description as transaction_description 
         FROM ledger_entries l 
         JOIN transactions t ON l.transaction_id = t.id
         WHERE l.account_id = $1 
         ORDER BY l.created_at DESC 
         LIMIT $2 OFFSET $3`,
        [accountId, limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM ledger_entries WHERE account_id = $1`, [
        accountId,
      ]),
    ]);

    return {
      entries: entriesResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }

  async calculateAccountBalance(accountId: string): Promise<number> {
    const result = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as balance FROM ledger_entries WHERE account_id = $1`,
      [accountId]
    );
    return parseFloat(result.rows[0].balance);
  }

  async findUnbalancedTransactions(): Promise<
    Array<{ transaction_id: string; total_amount: number; entry_count: number }>
  > {
    const result = await db.query(`
      SELECT 
        transaction_id,
        SUM(amount) as total_amount,
        COUNT(*) as entry_count
      FROM ledger_entries 
      GROUP BY transaction_id 
      HAVING ABS(SUM(amount)) > 0.01
    `);

    return result.rows.map((row) => ({
      transaction_id: row.transaction_id,
      total_amount: parseFloat(row.total_amount),
      entry_count: parseInt(row.entry_count, 10),
    }));
  }

  async countDistinctTransactions(): Promise<number> {
    const result = await db.query(
      "SELECT COUNT(DISTINCT transaction_id) as total FROM ledger_entries"
    );
    return parseInt(result.rows[0].total, 10);
  }

  async getAllAccountBalances(): Promise<
    Array<{ id: string; account_balance: number; ledger_balance: number }>
  > {
    const result = await db.query(`
      SELECT 
        a.id,
        a.balance as account_balance,
        COALESCE(SUM(l.amount), 0) as ledger_balance
      FROM accounts a
      LEFT JOIN ledger_entries l ON a.id = l.account_id
      GROUP BY a.id, a.balance
    `);

    return result.rows.map((row) => ({
      id: row.id,
      account_balance: parseFloat(row.account_balance),
      ledger_balance: parseFloat(row.ledger_balance),
    }));
  }
}
