import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorAlert from "../../../components/ui/ErrorAlert/ErrorAlert";
import DashboardHeader from "./DashboardHeader";
import AccountsGrid from "./AccountsGrid";
import ExchangeRates from "./ExchangeRates";
import TransferModal from "../../transactions/components/TransferModal";
import ExchangeModal from "../../transactions/components/ExchangeModal";
import TransactionList from "../../transactions/components/TransactionList";
import TransactionReceiptModal from "../../transactions/components/TransactionReceiptModal";
import { useDashboard } from "../hooks/useDashboard";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { Transaction } from "../../../models/Banking";

const Dashboard = () => {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);

  const {
    accounts,
    transactions,
    loading,
    error,
    exchangeRates,
    handleTransfer,
    handleExchange,
    clearError,
    refreshData,
  } = useDashboard();

  const {
    isConnected,
    connectionError,
    subscribeToAccount,
    unsubscribeFromAccount,
    onBalanceUpdate,
    onTransactionNotification,
  } = useWebSocket();

  // Subscribe to account balance updates
  useEffect(() => {
    if (isConnected && accounts.length > 0) {
      accounts.forEach((account) => {
        subscribeToAccount(account.id);
      });

      return () => {
        accounts.forEach((account) => {
          unsubscribeFromAccount(account.id);
        });
      };
    }
  }, [isConnected, accounts, subscribeToAccount, unsubscribeFromAccount]);

  // Handle real-time balance updates
  useEffect(() => {
    onBalanceUpdate((update) => {
      console.log("Balance updated:", update);
      // Refresh dashboard data to get updated balances
      refreshData();

      // Show notification
      const notification = `Balance updated: ${update.newBalance} ${update.currency}`;
      setNotifications((prev) => [...prev.slice(-4), notification]); // Keep last 5 notifications

      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n !== notification));
      }, 5000);
    });
  }, [onBalanceUpdate, refreshData]);

  // Handle real-time transaction notifications
  useEffect(() => {
    onTransactionNotification((notification) => {
      console.log("New transaction:", notification);
      // Refresh dashboard data to show new transaction
      refreshData();

      // Show notification
      const message = `New transaction: ${notification.transaction.type}`;
      setNotifications((prev) => [...prev.slice(-4), message]);

      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n !== message));
      }, 5000);
    });
  }, [onTransactionNotification, refreshData]);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const handleTransferSuccess = async (result: any) => {
    await handleTransfer(result);
    setShowTransferModal(false);
  };

  const handleExchangeSuccess = async (result: any) => {
    await handleExchange(result);
    setShowExchangeModal(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onClose={clearError} />}

      {connectionError && (
        <ErrorAlert
          message={`WebSocket connection error: ${connectionError}`}
          onClose={() => {}}
        />
      )}

      {/* Connection Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-xs text-gray-600">
            {isConnected
              ? "Real-time updates active"
              : "Real-time updates disconnected"}
          </span>
        </div>
      </div>

      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out animate-pulse"
            >
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4" />
                <span className="text-sm font-medium">{notification}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account Overview */}
      <div>
        <DashboardHeader
          onTransferClick={() => setShowTransferModal(true)}
          onExchangeClick={() => setShowExchangeModal(true)}
        />
        <AccountsGrid accounts={accounts} />
      </div>

      {/* Exchange Rates */}
      {exchangeRates && <ExchangeRates rates={exchangeRates} />}

      {/* Recent Transactions */}
      <TransactionList
        transactions={transactions}
        onTransactionClick={handleTransactionClick}
      />

      {/* Modals */}
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        accounts={accounts}
        onSubmit={handleTransferSuccess}
      />

      {exchangeRates && (
        <ExchangeModal
          isOpen={showExchangeModal}
          onClose={() => setShowExchangeModal(false)}
          accounts={accounts}
          exchangeRates={exchangeRates}
          onSubmit={handleExchangeSuccess}
        />
      )}

      <TransactionReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default Dashboard;
