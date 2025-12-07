import { useState } from "react";
import { Account } from "../../../models/Banking";

interface TransferData {
  from_account_id: string;
  to_account_id: string;
  amount: string;
  description: string;
}

interface ValidationErrors {
  from_account_id?: string;
  to_account_id?: string;
  amount?: string;
  general?: string;
}

export const useTransferForm = (accounts: Account[]) => {
  const [formData, setFormData] = useState<TransferData>({
    from_account_id: "",
    to_account_id: "",
    amount: "",
    description: "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  const resetForm = () => {
    setFormData({
      from_account_id: "",
      to_account_id: "",
      amount: "",
      description: "",
    });
    setErrors({});
  };

  const updateField = (field: keyof TransferData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.from_account_id) {
      newErrors.from_account_id = "Please select a source account";
    }

    if (!formData.to_account_id) {
      newErrors.to_account_id = "Please select a destination account";
    }

    if (formData.from_account_id === formData.to_account_id) {
      newErrors.general = "Source and destination accounts must be different";
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = "Please enter a valid positive amount";
    }

    if (formData.from_account_id && !isNaN(amount) && amount > 0) {
      const fromAccount = accounts.find(
        (acc) => acc.id === formData.from_account_id
      );
      if (fromAccount && amount > fromAccount.balance) {
        newErrors.amount = "Insufficient funds for this transfer";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    formData,
    errors,
    updateField,
    validateForm,
    resetForm,
    setGeneralError: (error: string) =>
      setErrors((prev) => ({ ...prev, general: error })),
  };
};
