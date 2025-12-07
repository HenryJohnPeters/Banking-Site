import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) => {
  const baseClasses =
    "font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors transition-shadow duration-200 relative overflow-hidden";

  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white focus:ring-blue-500 shadow-lg hover:shadow-xl",
    secondary:
      "bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200 text-gray-700 focus:ring-gray-300 shadow-md hover:shadow-lg",
    success:
      "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white focus:ring-green-500 shadow-lg hover:shadow-xl",
    danger:
      "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white focus:ring-red-500 shadow-lg hover:shadow-xl",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${
          isDisabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:scale-[1.02] active:scale-[0.98] transition-transform"
        }
        ${className}
      `.trim()}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <Loader2 className="animate-spin -ml-1 mr-3 h-4 w-4" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
