import { Transaction } from "../../../models/Banking";
import Card from "../../../components/ui/Card/Card";
import TransactionRow from "./TransactionRow";

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable = ({ transactions }: TransactionTableProps) => {
  const tableHeaders = [
    "Transaction",
    "Type",
    "Amount",
    "Status",
    "Date",
    "Reference",
  ];

  return (
    <Card padding={false}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {tableHeaders.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default TransactionTable;
