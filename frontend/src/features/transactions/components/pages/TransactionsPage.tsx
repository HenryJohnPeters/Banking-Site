import { useState, useEffect } from "react";
import { ArrowRightLeft, Plus, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Account, Transaction } from "../../../../models/Banking";
import { accountsApi } from "../../../../api/accounts";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import ErrorAlert from "../../../../components/ui/ErrorAlert/ErrorAlert";
import Button from "../../../../components/ui/Button";
import TransferModal from "../modals/TransferModal";
import TransactionList from "../TransactionList";
import TransactionReceiptModal from "../modals/TransactionReceiptModal";
import { useDashboard } from "../../../accounts/hooks/useDashboard";
import { useToast } from "../../../../hooks/useToast";
import { ToastContainer } from "../../../../components/ui/Toast/Toast";

const TransactionsPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { transactions, handleTransfer, refreshData } = useDashboard();
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

  const handleTransferSuccess = async (result: any) => {
    await handleTransfer(result);
    setShowTransferModal(false);
    showToast(
      `Transfer of ${result.amount} ${result.currency} completed successfully!`,
      { type: "success" }
    );
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
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">
            Send money between your accounts or to others
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowTransferModal(true)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Quick Transfer
          </Button>
          <Button
            onClick={() => navigate("/transfer")}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Detailed Transfer
          </Button>
        </div>
      </div>

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
                  Your latest transfer activity
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {
                transactions.filter(
                  (t) =>
                    t.type === "TRANSFER" ||
                    t.type === "DEPOSIT" ||
                    t.type === "WITHDRAWAL"
                ).length
              }{" "}
              total
            </div>
          </div>
        </div>

        <div className="p-0">
          <TransactionList
            transactions={transactions.filter(
              (t) =>
                t.type === "TRANSFER" ||
                t.type === "DEPOSIT" ||
                t.type === "WITHDRAWAL"
            )}
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

      <TransactionReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default TransactionsPage;
