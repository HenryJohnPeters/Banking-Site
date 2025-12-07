import { useState } from "react";
import { Account } from "../../../models/Banking";
import { formatCurrency, getCurrencyIcon } from "../../../utils/formatters";
import Card from "../../../components/ui/Card/Card";
import { Clipboard, Check } from "lucide-react";

interface AccountCardProps {
  account: Account;
}

const AccountCard = ({ account }: AccountCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAccountId = async () => {
    try {
      await navigator.clipboard.writeText(account.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy account ID:", err);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {account.currency} Account
          </p>
          <p className="text-3xl font-semibold text-gray-900">
            {formatCurrency(account.balance, account.currency)}
          </p>
        </div>
        <div className="p-3 rounded-full bg-blue-50">
          <span className="text-2xl">{getCurrencyIcon(account.currency)}</span>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-xs text-gray-500 mb-1">Account ID:</p>
        <div
          className="group relative cursor-pointer"
          onClick={handleCopyAccountId}
        >
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md border hover:bg-gray-100 transition-colors">
            <code className="text-xs font-mono text-gray-700 flex-1 break-all">
              {account.id}
            </code>
            <div className="shrink-0">
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Clipboard className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              )}
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {copied ? "Copied!" : "Click to copy"}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AccountCard;
