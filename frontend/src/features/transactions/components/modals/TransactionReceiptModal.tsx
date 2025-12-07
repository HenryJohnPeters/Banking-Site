import { useEffect } from "react";
import { Transaction } from "../../../../models/Banking";
import { formatCurrency, formatDate } from "../../../../utils/formatters";
import Button from "../../../../components/ui/Button/Button";
import StatusBadge from "../../../../components/ui/StatusBadge/StatusBadge";
import {
  Download,
  Info,
  Printer,
  X,
  CheckCircle2,
  CreditCard,
} from "lucide-react";

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
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scroll
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="relative from-blue-50 to-indigo-50 px-6 py-6 text-center">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-white bg-opacity-20 p-2 text-gray-600 hover:bg-opacity-30 hover:text-gray-800 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900">
              Transaction Complete
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              {formatDate(transaction.created_at)}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Amount */}
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-1">Amount</p>
              <p className={`text-2xl font-bold ${direction.color}`}>
                {direction.prefix}
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
              <div className="mt-2">
                <StatusBadge status={transaction.status} />
              </div>
            </div>

            {/* Details Card */}
            <div className="rounded-xl bg-gray-50 p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  Transaction Details
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-mono text-gray-900">
                    {transaction.id.slice(0, 8)}...
                  </span>
                </div>

                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600">Type:</span>
                  <span className="text-gray-900">{getTransactionType()}</span>
                </div>

                {transaction.description && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-600">Description:</span>
                    <span className="text-gray-900 text-right truncate max-w-32">
                      {transaction.description}
                    </span>
                  </div>
                )}

                {transaction.from_account_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="font-mono text-gray-900">
                      ****{transaction.from_account_id.slice(-4)}
                    </span>
                  </div>
                )}

                {transaction.to_account_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">To:</span>
                    <span className="font-mono text-gray-900">
                      ****{transaction.to_account_id.slice(-4)}
                    </span>
                  </div>
                )}

                {transaction.type === "EXCHANGE" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">From:</span>
                      <span className="text-gray-900">
                        {transaction.from_currency}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To:</span>
                      <span className="text-gray-900">
                        {transaction.to_currency}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Secure Transaction
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    This receipt confirms your transaction was processed
                    securely. Keep for your records.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                variant="secondary"
                size="sm"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Printer className="h-3 w-3" />
                Print
              </Button>
              <Button
                onClick={handleDownloadPDF}
                variant="secondary"
                size="sm"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
              <Button onClick={onClose} size="sm" className="flex-1">
                Close
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-2 text-center">
            <p className="text-xs text-gray-500">
              Banking App • Secure Digital Banking
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionReceiptModal;
