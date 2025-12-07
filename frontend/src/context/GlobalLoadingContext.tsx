import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface GlobalLoadingContextType {
  requestsInFlight: number;
  isLoading: boolean;
  incrementRequests: () => void;
  decrementRequests: () => void;
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const GlobalLoadingContext = createContext<
  GlobalLoadingContextType | undefined
>(undefined);

export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (context === undefined) {
    throw new Error(
      "useGlobalLoading must be used within a GlobalLoadingProvider"
    );
  }
  return context;
};

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider = ({
  children,
}: GlobalLoadingProviderProps) => {
  const [requestsInFlight, setRequestsInFlight] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const incrementRequests = useCallback(() => {
    setRequestsInFlight((prev) => prev + 1);
  }, []);

  const decrementRequests = useCallback(() => {
    setRequestsInFlight((prev) => Math.max(0, prev - 1));
  }, []);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
    },
    []
  );

  const value = {
    requestsInFlight,
    isLoading: requestsInFlight > 0,
    incrementRequests,
    decrementRequests,
    globalError,
    setGlobalError,
    showToast,
  };

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}

      {/* Global Loading Bar */}
      {requestsInFlight > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-blue-600 animate-pulse shadow-lg"></div>
        </div>
      )}

      {/* Global Error Banner */}
      {globalError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-right">
          <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-2xl max-w-md flex items-center space-x-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">{globalError}</span>
            <button
              onClick={() => setGlobalError(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in-right ${
                toast.type === "success"
                  ? "bg-green-600"
                  : toast.type === "error"
                  ? "bg-red-600"
                  : "bg-blue-600"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </GlobalLoadingContext.Provider>
  );
};
