import React from "react";
import { CheckCircle, X } from "lucide-react";

interface SuccessToastProps {
  message: string;
  onClose: () => void;
  autoHideDuration?: number;
}

const SuccessToast: React.FC<SuccessToastProps> = ({
  message,
  onClose,
  autoHideDuration = 5000,
}) => {
  React.useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl max-w-md flex items-start space-x-3">
        <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-sm">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SuccessToast;
