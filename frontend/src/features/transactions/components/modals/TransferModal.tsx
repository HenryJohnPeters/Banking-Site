import { Account, TransferRequest } from "../../../../models/Banking";
import { Send, X } from "lucide-react";
import TransferForm from "../forms/TransferForm";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSubmit: (data: TransferRequest) => Promise<void>;
}

const TransferModal = ({
  isOpen,
  onClose,
  accounts,
  onSubmit,
}: TransferModalProps) => {
  const handleSubmit = async (data: TransferRequest) => {
    await onSubmit(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white shadow-2xl rounded-2xl w-full max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Custom Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:text-gray-200 hover:bg-white/10 rounded-full p-2 transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Simple Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Quick Transfer
                </h2>
                <p className="text-blue-100 text-sm">Instant & secure</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-8 py-6 rounded-b-2xl">
          <TransferForm
            accounts={accounts}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitButtonText="Send Transfer"
            cancelButtonText="Cancel"
            showAvailableBalance={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
