import { Transaction } from "../../../models/Banking";
import {
  formatCurrency,
  formatDate,
  getTransactionIcon,
} from "../../../utils/formatters";
import StatusBadge from "../../../components/ui/StatusBadge/StatusBadge";

interface TransactionRowProps {
  transaction: Transaction;
  onTransactionClick?: (transaction: Transaction) => void;
}

const TransactionRow = ({
  transaction,
  onTransactionClick,
}: TransactionRowProps) => {
  const getTransactionColor = (transaction: Transaction) => {
    return transaction.from_account_id ? "text-red-600" : "text-green-600";
  };

  const getAmountPrefix = (transaction: Transaction) => {
    return transaction.from_account_id ? "-" : "+";
  };

  const handleClick = () => {
    if (onTransactionClick) {
      onTransactionClick(transaction);
    }
  };

  return (
    <tr
      key={transaction.id}
      className={`hover:bg-gray-50 ${
        onTransactionClick ? "cursor-pointer" : ""
      }`}
      onClick={handleClick}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="text-lg mr-3">
            {getTransactionIcon(transaction.type)}
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {transaction.description}
            </div>
            <div className="text-xs text-gray-500">
              ID: {transaction.id.slice(0, 8)}...
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={transaction.type} type="transaction-type" />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div
          className={`text-sm font-medium ${getTransactionColor(transaction)}`}
        >
          {getAmountPrefix(transaction)}
          {formatCurrency(transaction.amount, transaction.currency)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={transaction.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatDate(transaction.created_at)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {transaction.reference_id
          ? transaction.reference_id.slice(0, 8) + "..."
          : "-"}
      </td>
      {onTransactionClick && (
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <button
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            View Receipt
          </button>
        </td>
      )}
    </tr>
  );
};

export default TransactionRow;
