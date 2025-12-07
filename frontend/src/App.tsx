import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  GlobalLoadingProvider,
  useGlobalLoading,
} from "./context/GlobalLoadingContext";
import { initializeInterceptors } from "./api/client";
import LoginPage from "./features/auth/components/Login";
import RegisterPage from "./features/auth/components/Register";
import Dashboard from "./features/accounts/components/Dashboard";
import TransactionsPage from "./features/transactions/components/pages/TransactionsPage";
import ExchangePage from "./features/transactions/components/pages/ExchangePage";
import TransferPage from "./features/transactions/components/pages/TransferPage";
import ExchangeFormPage from "./features/transactions/components/pages/ExchangeFormPage";
import TransactionHistory from "./features/transactions/components/pages/TransactionHistory";
import Layout from "./components/layout/Layout";
import LoadingSpinner from "./components/ui/LoadingSpinner";
import "./index.css";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Layout>
              <TransactionsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfer"
        element={
          <ProtectedRoute>
            <Layout>
              <TransferPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exchange"
        element={
          <ProtectedRoute>
            <Layout>
              <ExchangePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/exchange-currency"
        element={
          <ProtectedRoute>
            <Layout>
              <ExchangeFormPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <Layout>
              <TransactionHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const AppWithInterceptors = () => {
  const { incrementRequests, decrementRequests, setGlobalError } =
    useGlobalLoading();

  useEffect(() => {
    // Initialize API interceptors with global loading context
    initializeInterceptors(
      incrementRequests,
      decrementRequests,
      setGlobalError
    );
  }, [incrementRequests, decrementRequests, setGlobalError]);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <AppRoutes />
      </div>
    </Router>
  );
};

const App = () => {
  return (
    <GlobalLoadingProvider>
      <AuthProvider>
        <AppWithInterceptors />
      </AuthProvider>
    </GlobalLoadingProvider>
  );
};

export default App;
