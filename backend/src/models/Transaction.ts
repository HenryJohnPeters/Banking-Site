import { Currency } from "./Account";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
} from "class-validator";

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
  reference_id?: string; // For linking related transactions (e.g., exchange pairs)
  created_at: Date;
  updated_at: Date;
  from_currency?: Currency;
  to_currency?: Currency;
  to_amount?: number; // For exchange transactions
}

export class TransferDto {
  @IsUUID()
  @IsNotEmpty()
  from_account_id: string;

  @IsUUID()
  @IsNotEmpty()
  to_account_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export class ExchangeDto {
  @IsUUID()
  @IsNotEmpty()
  from_account_id: string;

  @IsUUID()
  @IsNotEmpty()
  to_account_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(999999.99)
  from_amount: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  exchange_rate: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  idempotency_key?: string;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
