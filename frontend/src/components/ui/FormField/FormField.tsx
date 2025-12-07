import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  type?: "text" | "email" | "password" | "number" | "select";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  step?: string;
  options?: Array<{ value: string; label: string }>;
  className?: string;
  error?: string;
}

const FormField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  step,
  options = [],
  className = "",
  error,
}: FormFieldProps) => {
  const baseInputClassName = `w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 ${
    error
      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50/30"
      : ""
  } ${className}`;

  const renderInput = () => {
    if (type === "select") {
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClassName}
          required={required}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseInputClassName}
        placeholder={placeholder}
        required={required}
        step={step}
      />
    );
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      {renderInput()}
      {error && (
        <p className="text-sm text-red-600 flex items-center mt-1">
          <AlertCircle className="w-4 h-4 mr-1 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
