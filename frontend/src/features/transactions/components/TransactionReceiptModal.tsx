import { Transaction } from "../../../models/Banking";
import {
  formatCurrency,
  formatDate,
  getTransactionIcon,
} from "../../../utils/formatters";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import StatusBadge from "../../../components/ui/StatusBadge";
import { Info, Printer, Download } from "lucide-react";

interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const TransactionReceiptModal = ({
  isOpen,
  onClose,
  transaction,
}: TransactionReceiptModalProps) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // This would integrate with a PDF generation library in a real app
    console.log("Download PDF functionality would be implemented here");
  };

  const getTransactionType = () => {
    switch (transaction.type) {
      case "TRANSFER":
        return "Money Transfer";
      case "EXCHANGE":
        return "Currency Exchange";
      case "DEPOSIT":
        return "Deposit";
      case "WITHDRAWAL":
        return "Withdrawal";
      default:
        return transaction.type;
    }
  };

  const getTransactionDirection = () => {
    if (transaction.from_account_id) {
      return {
        direction: "outgoing",
        color: "text-red-600",
        prefix: "-",
      };
    } else {
      return {
        direction: "incoming",
        color: "text-green-600",
        prefix: "+",
      };
    }
  };

  const direction = getTransactionDirection();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Receipt">
      <div className="max-w-md mx-auto bg-white">
        {/* Receipt Header */}
        <div className="text-center border-b border-gray-200 pb-6 mb-6">
          <div className="text-4xl mb-2">
            {getTransactionIcon(transaction.type)}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Transaction Receipt
          </h2>
          <p className="text-sm text-gray-500">
            {formatDate(transaction.created_at)}
          </p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">
              Transaction ID:
            </span>
            <span className="text-sm text-gray-900 font-mono">
              {transaction.id.slice(0, 8)}...{transaction.id.slice(-8)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Type:</span>
            <span className="text-sm text-gray-900">
              {getTransactionType()}
            </span>
          </div>

          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <StatusBadge status={transaction.status} />
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-lg font-semibold text-gray-600">Amount:</span>
            <span className={`text-xl font-bold ${direction.color}`}>
              {direction.prefix}
              {formatCurrency(transaction.amount, transaction.currency)}
            </span>
          </div>

          {transaction.description && (
            <div className="flex justify-between items-start py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">
                Description:
              </span>
              <span className="text-sm text-gray-900 text-right max-w-48">
                {transaction.description}
              </span>
            </div>
          )}

          {transaction.reference_id && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">
                Reference ID:
              </span>
              <span className="text-sm text-gray-900 font-mono">
                {transaction.reference_id.slice(0, 8)}...
              </span>
            </div>
          )}

          {/* Account Information */}
          {transaction.from_account_id && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">
                From Account:
              </span>
              <span className="text-sm text-gray-900 font-mono">
                ...{transaction.from_account_id.slice(-8)}
              </span>
            </div>
          )}

          {transaction.to_account_id && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">
                To Account:
              </span>
              <span className="text-sm text-gray-900 font-mono">
                ...{transaction.to_account_id.slice(-8)}
              </span>
            </div>
          )}

          {/* Exchange Rate Information (for currency exchanges) */}
          {transaction.type === "EXCHANGE" && (
            <>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">
                  From Currency:
                </span>
                <span className="text-sm text-gray-900">
                  {transaction.from_currency}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-600">
                  To Currency:
                </span>
                <span className="text-sm text-gray-900">
                  {transaction.to_currency}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="shrink-0">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-800">
                Security Information
              </h3>
              <div className="mt-1 text-xs text-gray-600">
                <p>
                  This is an official transaction receipt. Keep it for your
                  records.
                </p>
                <p className="mt-1">
                  Transaction processed securely with end-to-end encryption.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPDF} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Banking App • Secure Digital Banking Platform
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Generated on {formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default TransactionReceiptModal;
