import { Account } from "../../../models/Banking";
import { formatCurrency } from "../../../utils/formatters";

interface AccountSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accounts: Account[];
  placeholder?: string;
  required?: boolean;
  excludeAccountId?: string;
  error?: string;
}

const AccountSelect = ({
  label,
  value,
  onChange,
  accounts,
  placeholder = "Select account",
  required = false,
  excludeAccountId,
  error,
}: AccountSelectProps) => {
  const filteredAccounts = excludeAccountId
    ? accounts.filter((acc) => acc.id !== excludeAccountId)
    : accounts;

  const baseClassName = `w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 ${
    error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : ""
  }`;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseClassName}
        required={required}
      >
        <option value="">{placeholder}</option>
        {filteredAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.currency} -{" "}
            {formatCurrency(account.balance, account.currency)}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default AccountSelect;
