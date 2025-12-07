interface ErrorAlertProps {
  message: string;
  onClose?: () => void;
}

const ErrorAlert = ({ message, onClose }: ErrorAlertProps) => {
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="shrink-0">
          <span className="text-red-400">⚠️</span>
        </div>
        <div className="ml-3 flex-1">
          <div className="text-sm text-red-800">{message}</div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
