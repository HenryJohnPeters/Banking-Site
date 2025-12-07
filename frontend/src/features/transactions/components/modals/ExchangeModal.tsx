import { Account, ExchangeRequest } from "../../../../models/Banking";
import { RefreshCw, X } from "lucide-react";
import ExchangeForm from "../forms/ExchangeForm";

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  exchangeRates: {
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  };
  onSubmit: (data: ExchangeRequest) => Promise<void>;
}

const ExchangeModal = ({
  isOpen,
  onClose,
  accounts,
  exchangeRates,
  onSubmit,
}: ExchangeModalProps) => {
  const handleSubmit = async (data: ExchangeRequest) => {
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
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Quick Exchange
                </h2>
                <p className="text-emerald-100 text-sm">Live market rates</p>
              </div>
            </div>

            {/* Compact Rate Display */}
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-xs text-emerald-100">USD → EUR</div>
                <div className="text-lg font-bold text-white">
                  {exchangeRates.USD_TO_EUR}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-emerald-100">EUR → USD</div>
                <div className="text-lg font-bold text-white">
                  {exchangeRates.EUR_TO_USD}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-8 py-6 rounded-b-2xl">
          <ExchangeForm
            accounts={accounts}
            exchangeRates={exchangeRates}
            onSubmit={handleSubmit}
            onCancel={onClose}
            submitButtonText="Exchange Now"
            cancelButtonText="Cancel"
            showAvailableBalance={true}
          />
        </div>
      </div>
    </div>
  );
};

export default ExchangeModal;
