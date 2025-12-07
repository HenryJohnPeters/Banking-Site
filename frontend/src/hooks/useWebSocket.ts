import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

interface BalanceUpdate {
  accountId: string;
  newBalance: number;
  currency: string;
  timestamp: Date;
}

interface TransactionNotification {
  transaction: any;
  timestamp: Date;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
  subscribeToAccount: (accountId: string) => void;
  unsubscribeFromAccount: (accountId: string) => void;
  onBalanceUpdate: (callback: (update: BalanceUpdate) => void) => void;
  onTransactionNotification: (
    callback: (notification: TransactionNotification) => void
  ) => void;
  disconnect: () => void;
}

export const useWebSocket = (): UseWebSocketReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const balanceUpdateCallbackRef = useRef<
    ((update: BalanceUpdate) => void) | null
  >(null);
  const transactionCallbackRef = useRef<
    ((notification: TransactionNotification) => void) | null
  >(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Create WebSocket connection
    const socket = io(
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
        "http://localhost:3001",
      {
        withCredentials: true, // This will send the httpOnly cookies
        transports: ["websocket", "polling"],
        upgrade: true,
      }
    );

    socketRef.current = socket;

    // Connection event handlers
    socket.on("connect", () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        setConnectionError("Server disconnected the connection");
      }
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);
    });

    // Balance update handler
    socket.on("balance:updated", (update: BalanceUpdate) => {
      console.log("Balance update received:", update);
      if (balanceUpdateCallbackRef.current) {
        balanceUpdateCallbackRef.current(update);
      }
    });

    // Transaction notification handler
    socket.on("transaction:new", (notification: TransactionNotification) => {
      console.log("Transaction notification received:", notification);
      if (transactionCallbackRef.current) {
        transactionCallbackRef.current(notification);
      }
    });

    // Subscription confirmation handler
    socket.on("subscribed", (data: { accountId: string }) => {
      console.log("Subscribed to account:", data.accountId);
    });

    socket.on("unsubscribed", (data: { accountId: string }) => {
      console.log("Unsubscribed from account:", data.accountId);
    });

    // Cleanup on unmount or user change
    return () => {
      console.log("Cleaning up WebSocket connection");
      socket.disconnect();
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [user]);

  const subscribeToAccount = (accountId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("subscribe:balance", { accountId });
    }
  };

  const unsubscribeFromAccount = (accountId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("unsubscribe:balance", { accountId });
    }
  };

  const onBalanceUpdate = (callback: (update: BalanceUpdate) => void) => {
    balanceUpdateCallbackRef.current = callback;
  };

  const onTransactionNotification = (
    callback: (notification: TransactionNotification) => void
  ) => {
    transactionCallbackRef.current = callback;
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setConnectionError(null);
  };

  return {
    isConnected,
    connectionError,
    subscribeToAccount,
    unsubscribeFromAccount,
    onBalanceUpdate,
    onTransactionNotification,
    disconnect,
  };
};
