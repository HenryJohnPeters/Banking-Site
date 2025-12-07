import { Transaction } from "../../../models/Banking";
import {
  formatCurrency,
  formatDate,
  getTransactionIcon,
} from "../../../utils/formatters";
import Card from "../../../components/ui/Card/Card";

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
}

const TransactionList = ({
  transactions,
  onTransactionClick,
}: TransactionListProps) => {
  return (
    <Card padding={false}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Recent Transactions
        </h3>
      </div>
      <div className="overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <li className="px-6 py-4 text-center text-gray-500">
              No transactions yet
            </li>
          ) : (
            transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => onTransactionClick?.(transaction)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <span className="text-lg">
                        {getTransactionIcon(transaction.type)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        transaction.from_account_id
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {transaction.from_account_id ? "-" : "+"}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </Card>
  );
};

export default TransactionList;
