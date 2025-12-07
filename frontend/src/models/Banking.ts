export enum Currency {
  USD = "USD",
  EUR = "EUR",
}

export interface Account {
  id: string;
  user_id: string;
  currency: Currency;
  balance: number;
  created_at: string;
  updated_at: string;
}

export enum TransactionType {
  TRANSFER = "TRANSFER",
  EXCHANGE = "EXCHANGE",
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface Transaction {
  id: string;
  from_account_id?: string;
  to_account_id: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  reference_id?: string;
  created_at: string;
  updated_at: string;
  from_currency?: Currency;
  to_currency?: Currency;
}

export interface TransferRequest {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

export interface ExchangeRequest {
  from_account_id: string;
  to_account_id: string;
  from_amount: number;
  exchange_rate: number;
  description?: string;
  idempotencyKey?: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
