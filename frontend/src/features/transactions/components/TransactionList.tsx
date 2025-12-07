import { Transaction } from "../../../models/Banking";
import {
  formatCurrency,
  formatDate,
  getTransactionIcon,
} from "../../../utils/formatters";
import Button from "../../../components/ui/Button";
import { ExternalLink, ArrowRightLeft } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
  showViewAll?: boolean;
  viewAllHref?: string;
  title?: string;
  maxDisplayed?: number;
}

const TransactionList = ({
  transactions,
  onTransactionClick,
  showViewAll = false,
  viewAllHref,
  title = "Recent Transactions",
  maxDisplayed = 5,
}: TransactionListProps) => {
  // Limit displayed transactions if maxDisplayed is specified
  const displayedTransactions = showViewAll
    ? transactions.slice(0, maxDisplayed)
    : transactions;

  const hasMoreTransactions = showViewAll && transactions.length > maxDisplayed;

  return (
    <div className="w-full">
      {title && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {showViewAll && hasMoreTransactions && viewAllHref && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (window.location.href = viewAllHref)}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View All ({transactions.length})
            </Button>
          )}
        </div>
      )}

      <div className="w-full">
        {displayedTransactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <ArrowRightLeft className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-4">No transactions yet</p>
            <p className="text-sm text-gray-400">
              Your transaction history will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayedTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-all duration-150 group"
                onClick={() => onTransactionClick?.(transaction)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <span className="text-lg">
                          {getTransactionIcon(transaction.type)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {formatDate(transaction.created_at)}
                        </p>
                        {transaction.type === "EXCHANGE" &&
                          transaction.from_currency &&
                          transaction.to_currency && (
                            <>
                              <span className="text-gray-300">•</span>
                              <p className="text-xs text-blue-600 font-medium">
                                {transaction.from_currency} →{" "}
                                {transaction.to_currency}
                              </p>
                            </>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <p
                      className={`text-sm font-semibold ${
                        transaction.from_account_id
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {transaction.from_account_id ? "-" : "+"}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    <p
                      className={`text-xs font-medium mt-1 ${
                        transaction.status === "COMPLETED"
                          ? "text-green-600"
                          : transaction.status === "FAILED"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {transaction.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showViewAll && hasMoreTransactions && viewAllHref && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => (window.location.href = viewAllHref)}
              className="w-full flex items-center justify-center gap-2 hover:bg-white transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View All {transactions.length} Transactions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
