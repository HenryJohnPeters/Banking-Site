import { Transaction } from "../../../models/Banking";
import { formatCurrency } from "../../../utils/formatters";

export interface TransactionDisplay {
  color: string;
  prefix: string;
  formattedAmount: string;
  isExchange: boolean;
}

export const formatTransactionDisplay = (
  transaction: Transaction
): TransactionDisplay => {
  const isExchange = transaction.type === "EXCHANGE";

  if (isExchange) {
    const fromCurrency = transaction.from_currency || transaction.currency;
    const toCurrency = transaction.to_currency;
    const fromAmount = Math.abs(transaction.amount);
    const toAmount = transaction.to_amount;

    let formattedAmount = formatCurrency(fromAmount, fromCurrency);

    if (toCurrency && fromCurrency !== toCurrency && toAmount) {
      formattedAmount = `${formatCurrency(
        fromAmount,
        fromCurrency
      )} → ${formatCurrency(toAmount, toCurrency)}`;
    }

    return {
      color: "text-blue-600",
      prefix: "",
      formattedAmount,
      isExchange: true,
    };
  }

  // Regular transaction (transfer, deposit, withdrawal)
  const isOutgoing = !!transaction.from_account_id;

  return {
    color: isOutgoing ? "text-red-600" : "text-green-600",
    prefix: isOutgoing ? "-" : "+",
    formattedAmount: formatCurrency(transaction.amount, transaction.currency),
    isExchange: false,
  };
};

export const getTransactionTypeLabel = (type: string): string => {
  const typeLabels: Record<string, string> = {
    TRANSFER: "Transfer",
    EXCHANGE: "Exchange",
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
  };

  return typeLabels[type] || type;
};
