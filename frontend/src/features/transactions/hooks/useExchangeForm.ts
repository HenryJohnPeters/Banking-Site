import { useState, useMemo } from "react";
import { Account } from "../../../models/Banking";

interface ExchangeData {
  from_account_id: string;
  to_account_id: string;
  from_amount: string;
  description: string;
}

interface ExchangeRates {
  USD_TO_EUR: number;
  EUR_TO_USD: number;
}

interface ValidationErrors {
  from_account_id?: string;
  to_account_id?: string;
  from_amount?: string;
  general?: string;
}

export const useExchangeForm = (
  accounts: Account[],
  exchangeRates: ExchangeRates
) => {
  const [formData, setFormData] = useState<ExchangeData>({
    from_account_id: "",
    to_account_id: "",
    from_amount: "",
    description: "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  const resetForm = () => {
    setFormData({
      from_account_id: "",
      to_account_id: "",
      from_amount: "",
      description: "",
    });
    setErrors({});
  };

  const updateField = (field: keyof ExchangeData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const exchangePreview = useMemo(() => {
    if (
      !formData.from_amount ||
      !formData.from_account_id ||
      !formData.to_account_id
    ) {
      return null;
    }

    const fromAccount = accounts.find(
      (acc) => acc.id === formData.from_account_id
    );
    const toAccount = accounts.find((acc) => acc.id === formData.to_account_id);

    if (
      !fromAccount ||
      !toAccount ||
      fromAccount.currency === toAccount.currency
    ) {
      return null;
    }

    const amount = parseFloat(formData.from_amount);
    if (isNaN(amount) || amount <= 0) return null;

    const rate =
      fromAccount.currency === "USD"
        ? exchangeRates.USD_TO_EUR
        : exchangeRates.EUR_TO_USD;

    const toAmount = amount * rate;

    return {
      rate,
      toAmount: toAmount.toFixed(2),
      fromCurrency: fromAccount.currency,
      toCurrency: toAccount.currency,
    };
  }, [formData, accounts, exchangeRates]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.from_account_id) {
      newErrors.from_account_id = "Please select a source account";
    }

    if (!formData.to_account_id) {
      newErrors.to_account_id = "Please select a destination account";
    }

    const amount = parseFloat(formData.from_amount);
    if (!formData.from_amount || isNaN(amount) || amount <= 0) {
      newErrors.from_amount = "Please enter a valid positive amount";
    }

    if (formData.from_account_id && formData.to_account_id) {
      const fromAccount = accounts.find(
        (acc) => acc.id === formData.from_account_id
      );
      const toAccount = accounts.find(
        (acc) => acc.id === formData.to_account_id
      );

      if (fromAccount && toAccount) {
        if (fromAccount.currency === toAccount.currency) {
          newErrors.general =
            "Please select accounts with different currencies for exchange";
        } else if (!isNaN(amount) && amount > fromAccount.balance) {
          newErrors.from_amount = "Insufficient funds for this exchange";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    formData,
    errors,
    exchangePreview,
    updateField,
    validateForm,
    resetForm,
    setGeneralError: (error: string) =>
      setErrors((prev) => ({ ...prev, general: error })),
  };
};
