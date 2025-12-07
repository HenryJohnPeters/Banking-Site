import { useMemo } from "react";
import { Account } from "../../../models/Banking";
import { useBaseForm, ValidationRule, BaseFormData } from "./useBaseForm";

interface ExchangeData extends BaseFormData {
  from_amount: string;
}

interface ExchangeRates {
  USD_TO_EUR: number;
  EUR_TO_USD: number;
}

interface ExchangeContext {
  accounts: Account[];
  exchangeRates: ExchangeRates;
}

const createExchangeValidationRules = (): ValidationRule<ExchangeContext>[] => [
  {
    field: "from_account_id",
    validator: (value) =>
      !value ? "Please select a source account" : undefined,
  },
  {
    field: "to_account_id",
    validator: (value, formData, context) => {
      if (!value) return "Please select a destination account";

      if (
        formData.from_account_id &&
        formData.to_account_id &&
        context?.accounts
      ) {
        const fromAccount = context.accounts.find(
          (acc) => acc.id === formData.from_account_id
        );
        const toAccount = context.accounts.find(
          (acc) => acc.id === formData.to_account_id
        );

        if (
          fromAccount &&
          toAccount &&
          fromAccount.currency === toAccount.currency
        ) {
          return "Please select accounts with different currencies for exchange";
        }
      }

      return undefined;
    },
  },
  {
    field: "from_amount",
    validator: (value, formData, context) => {
      const amount = parseFloat(value);
      if (!value || isNaN(amount) || amount <= 0) {
        return "Please enter a valid positive amount";
      }

      if (formData.from_account_id && context?.accounts) {
        const fromAccount = context.accounts.find(
          (acc) => acc.id === formData.from_account_id
        );
        if (fromAccount && amount > fromAccount.balance) {
          return "Insufficient funds for this exchange";
        }
      }

      return undefined;
    },
  },
];

export const useExchangeForm = (
  accounts: Account[],
  exchangeRates: ExchangeRates
) => {
  const initialData: ExchangeData = {
    from_account_id: "",
    to_account_id: "",
    from_amount: "",
    description: "",
  };

  const context: ExchangeContext = { accounts, exchangeRates };
  const validationRules = createExchangeValidationRules();

  const baseForm = useBaseForm(initialData, validationRules, context);

  const exchangePreview = useMemo(() => {
    if (
      !baseForm.formData.from_amount ||
      !baseForm.formData.from_account_id ||
      !baseForm.formData.to_account_id
    ) {
      return null;
    }

    const fromAccount = accounts.find(
      (acc) => acc.id === baseForm.formData.from_account_id
    );
    const toAccount = accounts.find(
      (acc) => acc.id === baseForm.formData.to_account_id
    );

    if (
      !fromAccount ||
      !toAccount ||
      fromAccount.currency === toAccount.currency
    ) {
      return null;
    }

    const amount = parseFloat(baseForm.formData.from_amount);
    if (isNaN(amount) || amount <= 0) return null;

    const rateKey =
      `${fromAccount.currency}_TO_${toAccount.currency}` as keyof ExchangeRates;
    const rate = exchangeRates[rateKey];

    if (!rate) return null;

    const toAmount = amount * rate;

    return {
      rate,
      toAmount: toAmount.toFixed(2),
      fromCurrency: fromAccount.currency,
      toCurrency: toAccount.currency,
    };
  }, [baseForm.formData, accounts, exchangeRates]);

  return {
    ...baseForm,
    exchangePreview,
  };
};
