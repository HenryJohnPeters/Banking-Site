import { Currency, TransactionType } from "../models/Banking";

export const formatCurrency = (amount: number, currency: Currency) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getTransactionIcon = (type: TransactionType) => {
  switch (type) {
    case TransactionType.DEPOSIT:
      return "📥";
    case TransactionType.WITHDRAWAL:
      return "📤";
    case TransactionType.TRANSFER:
      return "💸";
    case TransactionType.EXCHANGE:
      return "🔄";
    default:
      return "💰";
  }
};

export const getCurrencyIcon = (currency: Currency) => {
  return currency === Currency.USD ? "💵" : "💶";
};
