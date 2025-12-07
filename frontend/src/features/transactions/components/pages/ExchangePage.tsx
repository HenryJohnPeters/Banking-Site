import { useState, useEffect } from "react";
import { ArrowRightLeft, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Account, Transaction } from "../../../../models/Banking";
import { accountsApi } from "../../../../api/accounts";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import ErrorAlert from "../../../../components/ui/ErrorAlert/ErrorAlert";
import Button from "../../../../components/ui/Button";
import ExchangeModal from "../modals/ExchangeModal";
import ExchangeRates from "../../../accounts/components/ExchangeRates";
import TransactionList from "../TransactionList";
import TransactionReceiptModal from "../modals/TransactionReceiptModal";
import { useDashboard } from "../../../accounts/hooks/useDashboard";
import { useToast } from "../../../../hooks/useToast";
import { ToastContainer } from "../../../../components/ui/Toast/Toast";

const ExchangePage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { transactions, exchangeRates, handleExchange, refreshData } =
    useDashboard();
  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsData = await accountsApi.getUserAccounts();
      setAccounts(accountsData);
    } catch (_err) {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const handleExchangeSuccess = async (result: any) => {
    await handleExchange(result);
    setShowExchangeModal(false);
    showToast(`Currency exchange completed successfully!`, { type: "success" });
    setTimeout(() => refreshData(), 500);
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {error && <ErrorAlert message={error} onClose={() => setError("")} />}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Currency Exchange
          </h1>
          <p className="text-gray-600 mt-1">
            Exchange currencies at competitive rates
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowExchangeModal(true)}
            variant="secondary"
            className="flex items-center gap-2"
            disabled={!exchangeRates}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Quick Exchange
          </Button>
          <Button
            onClick={() => navigate("/exchange-currency")}
            className="flex items-center gap-2"
            disabled={!exchangeRates}
          >
            <ExternalLink className="h-4 w-4" />
            Detailed Exchange
          </Button>
        </div>
      </div>

      {/* Exchange Rates Widget */}
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

      {/* Recent Exchange Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowRightLeft className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Exchanges
                </h2>
                <p className="text-gray-600 text-sm">
                  Your latest currency exchange activity
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {transactions.filter((t) => t.type === "EXCHANGE").length} total
            </div>
          </div>
        </div>

        <div className="p-0">
          <TransactionList
            transactions={transactions.filter((t) => t.type === "EXCHANGE")}
            onTransactionClick={handleTransactionClick}
            showViewAll={true}
            viewAllHref="/history"
            title=""
            maxDisplayed={5}
          />
        </div>
      </div>

      {/* Modals */}
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

export default ExchangePage;
