import { Injectable } from "@nestjs/common";
import { db } from "../../shared/database/client";
import { PoolClient } from "pg";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PagedResult,
} from "../../models/Transaction";

@Injectable()
export class TransactionsRepository {
  async findByIdempotencyKey(
    client: PoolClient,
    idempotencyKey: string,
  ): Promise<Transaction | null> {
    const existing = await client.query(
      "SELECT * FROM transactions WHERE idempotency_key = $1",
      [idempotencyKey],
    );
    return existing.rows[0] ?? null;
  }

  async insertTransfer(
    client: PoolClient,
    data: {
      id: string;
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      currency: string;
      description: string | null;
      idempotencyKey?: string | null;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO transactions 
         (id, from_account_id, to_account_id, amount, currency, type, status, description, idempotency_key) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        data.id,
        data.fromAccountId,
        data.toAccountId,
        data.amount,
        data.currency,
        TransactionType.TRANSFER,
        TransactionStatus.COMPLETED,
        data.description,
        data.idempotencyKey ?? null,
      ],
    );
  }

  async insertExchange(
    client: PoolClient,
    data: {
      id: string;
      fromAccountId: string;
      toAccountId: string;
      fromAmount: number;
      fromCurrency: string;
      toAmount: number;
      toCurrency: string;
      description: string | null;
      idempotencyKey?: string | null;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO transactions 
         (id, from_account_id, to_account_id, amount, currency, type, status, description, idempotency_key) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        data.id,
        data.fromAccountId,
        data.toAccountId,
        data.fromAmount,
        data.fromCurrency,
        TransactionType.EXCHANGE,
        TransactionStatus.COMPLETED,
        data.description,
        data.idempotencyKey ?? null,
      ],
    );
  }

  async findById(id: string, client?: PoolClient): Promise<Transaction | null> {
    const executor = client || db;
    const result = await executor.query(
      "SELECT * FROM transactions WHERE id = $1",
      [id],
    );
    return result.rows[0] ?? null;
  }

  async getUserTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: TransactionType,
  ): Promise<PagedResult<Transaction>> {
    const offset = (page - 1) * limit;

    let whereClause = "WHERE (a1.user_id = $1 OR a2.user_id = $1)";
    const queryParams: any[] = [userId, limit, offset];

    if (type) {
      whereClause += ` AND t.type = $${queryParams.length + 1}`;
      queryParams.push(type);
    }

    const result = await db.query(
      `SELECT DISTINCT t.*, 
              a1.currency as from_currency,
              a2.currency as to_currency,
              u1.first_name || ' ' || u1.last_name as from_user_name,
              u2.first_name || ' ' || u2.last_name as to_user_name,
              CASE 
                WHEN t.type = 'EXCHANGE' THEN (
                  SELECT ABS(amount) 
                  FROM ledger_entries 
                  WHERE transaction_id = t.id 
                  AND account_id = t.to_account_id 
                  LIMIT 1
                )
                ELSE NULL
              END as to_amount
       FROM transactions t
       LEFT JOIN accounts a1 ON t.from_account_id = a1.id
       LEFT JOIN accounts a2 ON t.to_account_id = a2.id
       LEFT JOIN users u1 ON a1.user_id = u1.id
       LEFT JOIN users u2 ON a2.user_id = u2.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      queryParams,
    );

    let countWhereClause = "WHERE (a1.user_id = $1 OR a2.user_id = $1)";
    const countParams: any[] = [userId];

    if (type) {
      countWhereClause += ` AND t.type = $${countParams.length + 1}`;
      countParams.push(type);
    }

    const countResult = await db.query(
      `SELECT COUNT(DISTINCT t.id) FROM transactions t
       LEFT JOIN accounts a1 ON t.from_account_id = a1.id
       LEFT JOIN accounts a2 ON t.to_account_id = a2.id
       ${countWhereClause}`,
      countParams,
    );

    const total = parseInt(countResult.rows[0].count, 10);

    return {
      data: result.rows,
      total,
      page,
      limit,
    };
  }
}
