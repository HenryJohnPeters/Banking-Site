import { useState, useEffect } from "react";
import {
  Account,
  Transaction,
  TransferRequest,
  ExchangeRequest,
} from "../../../models/Banking";
import { accountsApi } from "../../../api/accounts";
import { transactionsApi } from "../../../api/transactions";

interface ExchangeRates {
  USD_TO_EUR: number;
  EUR_TO_USD: number;
}

export const useDashboard = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(
    null
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [accountsData, transactionsData, ratesData] = await Promise.all([
        accountsApi.getUserAccounts(),
        transactionsApi.getTransactionHistory(1, 10),
        transactionsApi.getExchangeRates(),
      ]);

      setAccounts(accountsData);
      setTransactions(transactionsData.data);
      setExchangeRates(ratesData);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (transferData: TransferRequest) => {
    try {
      await transactionsApi.transfer(transferData);
      await loadData(); // Refresh data after successful transfer
    } catch (error) {
      throw error; // Let the component handle the error display
    }
  };

  const handleExchange = async (exchangeData: ExchangeRequest) => {
    try {
      await transactionsApi.exchange(exchangeData);
      await loadData(); // Refresh data after successful exchange
    } catch (error) {
      throw error; // Let the component handle the error display
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    accounts,
    transactions,
    loading,
    error,
    exchangeRates,
    handleTransfer,
    handleExchange,
    clearError: () => setError(""),
    refreshData: loadData,
  };
};
