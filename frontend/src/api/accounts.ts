import { apiClient } from "./client";
import { Account, Transaction, PagedResult } from "../models/Banking";

export const accountsApi = {
  getUserAccounts: async (): Promise<Account[]> => {
    const response = await apiClient.get("/accounts");
    return response.data;
  },

  getAccount: async (accountId: string): Promise<Account> => {
    const response = await apiClient.get(`/accounts/${accountId}`);
    return response.data;
  },

  getAccountBalance: async (
    accountId: string
  ): Promise<{ balance: number; currency: string }> => {
    const response = await apiClient.get(`/accounts/${accountId}/balance`);
    return response.data;
  },

  getAccountTransactions: async (
    accountId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PagedResult<Transaction>> => {
    const response = await apiClient.get(
      `/accounts/${accountId}/transactions`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },
};
