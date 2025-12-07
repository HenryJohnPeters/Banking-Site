import React from "react";
import { Info, CheckCircle, AlertCircle, AlertTriangle, X } from "lucide-react";
import { Toast as ToastType } from "../../../hooks/useToast";

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="w-4 h-4" />;
      case "error":
        return <AlertCircle className="w-4 h-4" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getColorClasses = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-600 text-white";
      case "error":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-yellow-600 text-white";
      default:
        return "bg-blue-600 text-white";
    }
  };

  return (
    <div
      className={`${getColorClasses()} px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out animate-slide-in-right flex items-center justify-between gap-3`}
    >
      <div className="flex items-center space-x-2">
        {getIcon()}
        <span className="text-sm font-medium">{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="hover:opacity-80 transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default Toast;
