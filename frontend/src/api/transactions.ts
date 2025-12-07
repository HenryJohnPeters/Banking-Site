import { apiClient } from "./client";
import {
  Transaction,
  TransferRequest,
  ExchangeRequest,
  PagedResult,
} from "../models/Banking";

const generateIdempotencyKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export const transactionsApi = {
  transfer: async (data: TransferRequest): Promise<Transaction> => {
    const body: any = {
      ...data,
      idempotency_key: data.idempotencyKey ?? generateIdempotencyKey(),
    };
    delete body.idempotencyKey;

    const response = await apiClient.post("/transactions/transfer", body);
    return response.data;
  },

  exchange: async (
    data: ExchangeRequest
  ): Promise<{
    debitTransaction: Transaction;
    creditTransaction: Transaction;
  }> => {
    const body: any = {
      ...data,
      idempotency_key: data.idempotencyKey ?? generateIdempotencyKey(),
    };
    delete body.idempotencyKey;

    const response = await apiClient.post("/transactions/exchange", body);
    return response.data;
  },

  getTransactionHistory: async (
    page: number = 1,
    limit: number = 20,
    type?: string
  ): Promise<PagedResult<Transaction>> => {
    const params: any = { page, limit };
    if (type) {
      params.type = type;
    }

    const response = await apiClient.get("/transactions", {
      params,
    });
    return response.data;
  },

  getExchangeRates: async (): Promise<{
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  }> => {
    const response = await apiClient.get("/transactions/exchange-rates");
    return response.data;
  },
};
