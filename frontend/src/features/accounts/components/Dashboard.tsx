import { useState, useEffect } from "react";
import { ArrowRightLeft } from "lucide-react";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorAlert from "../../../components/ui/ErrorAlert/ErrorAlert";
import SuccessToast from "../../../components/ui/SuccessToast";
import { ToastContainer } from "../../../components/ui/Toast/Toast";
import DashboardHeader from "./DashboardHeader";
import AccountsGrid from "./AccountsGrid";
import ExchangeRates from "./ExchangeRates";
import TransferModal from "../../transactions/components/modals/TransferModal";
import ExchangeModal from "../../transactions/components/modals/ExchangeModal";
import TransactionList from "../../transactions/components/TransactionList";
import TransactionReceiptModal from "../../transactions/components/modals/TransactionReceiptModal";
import { useDashboard } from "../hooks/useDashboard";
import { useWebSocket } from "../../../hooks/useWebSocket";
import { useToast } from "../../../hooks/useToast";
import { Transaction } from "../../../models/Banking";

const Dashboard = () => {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { toasts, showToast, dismissToast } = useToast(5, 5000);

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

      showToast(`Balance updated: ${update.newBalance} ${update.currency}`, {
        type: "info",
      });
    });
  }, [onBalanceUpdate, refreshData, showToast]);

  // Handle real-time transaction notifications
  useEffect(() => {
    onTransactionNotification((notification) => {
      console.log("New transaction:", notification);
      // Refresh dashboard data to show new transaction
      refreshData();

      showToast(`New transaction: ${notification.transaction.type}`, {
        type: "info",
      });
    });
  }, [onTransactionNotification, refreshData, showToast]);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const handleTransferSuccess = async (result: any) => {
    await handleTransfer(result);
    setShowTransferModal(false);
    setSuccessMessage(
      `Transfer of ${result.amount} ${result.currency} completed successfully!`
    );
    // Auto-refresh to show updated balances
    setTimeout(() => refreshData(), 500);
  };

  const handleExchangeSuccess = async (result: any) => {
    await handleExchange(result);
    setShowExchangeModal(false);
    setSuccessMessage(`Currency exchange completed successfully!`);
    // Auto-refresh to show updated balances
    setTimeout(() => refreshData(), 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600 animate-pulse-subtle">
            Loading your accounts...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorAlert message={error} onClose={clearError} />}

      {successMessage && (
        <SuccessToast
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

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

      {/* Real-time Notifications using reusable hook */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Account Overview */}
      <div>
        <DashboardHeader
          onTransferClick={() => setShowTransferModal(true)}
          onExchangeClick={() => setShowExchangeModal(true)}
        />
        <AccountsGrid accounts={accounts} />
      </div>

      {/* Exchange Rates */}
      {exchangeRates && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Current Exchange Rates
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Live market rates for currency conversion
            </p>
          </div>
          <div className="p-6">
            <ExchangeRates rates={exchangeRates} />
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Transactions
                </h2>
                <p className="text-gray-600 text-sm">
                  Your latest activity across all accounts
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {transactions.length} total
            </div>
          </div>
        </div>

        <div className="p-0">
          <TransactionList
            transactions={transactions}
            onTransactionClick={handleTransactionClick}
            showViewAll={true}
            viewAllHref="/history"
            title=""
          />
        </div>
      </div>

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
