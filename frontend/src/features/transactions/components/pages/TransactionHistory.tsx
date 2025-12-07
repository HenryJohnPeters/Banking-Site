import { useState, useEffect } from "react";
import { Transaction, TransactionType } from "../../../../models/Banking";
import { transactionsApi } from "../../../../api/transactions";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import ErrorAlert from "../../../../components/ui/ErrorAlert/ErrorAlert";
import Pagination from "../../../../components/ui/Pagination/Pagination";
import TransactionFilter from "../forms/TransactionFilter";
import TransactionTable from "../TransactionTable";
import TransactionReceiptModal from "../modals/TransactionReceiptModal";

interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [filter, setFilter] = useState({
    type: "" as TransactionType | "",
  });

  useEffect(() => {
    loadTransactions();
  }, [pagination.page, pagination.limit, filter.type]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response: PagedResult<Transaction> =
        await transactionsApi.getTransactionHistory(
          pagination.page,
          pagination.limit,
          filter.type || undefined
        );

      setTransactions(response.data);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
      }));
    } catch {
      setError("Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (newType: TransactionType | "") => {
    setFilter({ type: newType });
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Transaction History
        </h1>
        <div className="text-sm text-gray-500">
          {pagination.total} total transactions
        </div>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError("")} />}

      <TransactionFilter
        selectedType={filter.type}
        onTypeChange={handleFilterChange}
      />

      <TransactionTable
        transactions={transactions}
        onTransactionClick={handleTransactionClick}
      />

      <Pagination
        currentPage={pagination.page}
        totalPages={totalPages}
        totalItems={pagination.total}
        itemsPerPage={pagination.limit}
        onPageChange={handlePageChange}
      />

      <TransactionReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
};

export default TransactionHistory;
