import { TransactionType } from "../../../models/Banking";
import Card from "../../../components/ui/Card/Card";

interface TransactionFilterProps {
  selectedType: TransactionType | "";
  onTypeChange: (type: TransactionType | "") => void;
}

const TransactionFilter = ({
  selectedType,
  onTypeChange,
}: TransactionFilterProps) => {
  return (
    <Card>
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">
          Filter by Type:
        </label>
        <select
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value as TransactionType | "")}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Transactions</option>
          <option value={TransactionType.TRANSFER}>Transfers</option>
          <option value={TransactionType.EXCHANGE}>Exchanges</option>
          <option value={TransactionType.DEPOSIT}>Deposits</option>
          <option value={TransactionType.WITHDRAWAL}>Withdrawals</option>
        </select>
      </div>
    </Card>
  );
};

export default TransactionFilter;
