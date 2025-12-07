import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../hooks/useToast";
import { ToastContainer } from "../ui/Toast/Toast";
import Breadcrumb from "../ui/Breadcrumb/Breadcrumb";
import { Home, ArrowRightLeft, RefreshCw, History } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toasts, showToast, dismissToast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      showToast("Logged out successfully. See you soon! 👋", {
        type: "success",
      });
      navigate("/login");
    } catch (_error) {
      showToast("Error logging out. Please try again.", { type: "error" });
    }
  };

  const navigationItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: Home,
      description: "Account overview",
    },
    {
      name: "Transactions",
      path: "/transactions",
      icon: ArrowRightLeft,
      description: "Transfer management",
    },
    {
      name: "Exchange",
      path: "/exchange",
      icon: RefreshCw,
      description: "Currency exchange",
    },
    {
      name: "History",
      path: "/history",
      icon: History,
      description: "Transaction history",
    },
  ];

  const isActivePath = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link
                to="/dashboard"
                className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                Banking Platform
              </Link>

              {/* Main Navigation Links */}
              <div className="hidden lg:flex space-x-6">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActivePath(item.path)
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      title={item.description}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="hidden md:block text-sm text-gray-700">
                Welcome, {user?.first_name} {user?.last_name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden pb-3 pt-2 border-t border-gray-200">
            {/* Main Navigation - Mobile */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActivePath(item.path)
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
