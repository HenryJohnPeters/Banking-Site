import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const Breadcrumb = () => {
  const location = useLocation();

  const getBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
    const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
      "/dashboard": [{ label: "Dashboard" }],
      "/transactions": [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Transactions" },
      ],
      "/transfer": [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Transactions", path: "/transactions" },
        { label: "New Transfer" },
      ],
      "/exchange": [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Exchange" },
      ],
      "/exchange-currency": [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Exchange", path: "/exchange" },
        { label: "Currency Exchange" },
      ],
      "/history": [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Transaction History" },
      ],
    };

    return (
      breadcrumbMap[pathname] || [{ label: "Dashboard", path: "/dashboard" }]
    );
  };

  const breadcrumbs = getBreadcrumbs(location.pathname);

  // Don't show breadcrumbs on dashboard or if there's only one item
  if (
    location.pathname === "/dashboard" ||
    location.pathname === "/" ||
    breadcrumbs.length <= 1
  ) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Home className="h-4 w-4" />
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          {crumb.path ? (
            <Link
              to={crumb.path}
              className="hover:text-blue-600 transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-900">{crumb.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
