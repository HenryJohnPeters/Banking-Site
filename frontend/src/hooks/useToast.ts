import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type?: "info" | "success" | "error" | "warning";
  duration?: number;
}

interface UseToastReturn {
  toasts: Toast[];
  showToast: (message: string, options?: Omit<Toast, "id" | "message">) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

export const useToast = (
  maxToasts: number = 5,
  defaultDuration: number = 5000
): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: Omit<Toast, "id" | "message">) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const duration = options?.duration ?? defaultDuration;

      const newToast: Toast = {
        id,
        message,
        type: options?.type ?? "info",
      };

      // Add toast, keeping only the last N toasts
      setToasts((prev) => [...prev.slice(-(maxToasts - 1)), newToast]);

      // Auto-dismiss after duration
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [maxToasts, defaultDuration, dismissToast]
  );

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    dismissToast,
    clearAllToasts,
  };
};
