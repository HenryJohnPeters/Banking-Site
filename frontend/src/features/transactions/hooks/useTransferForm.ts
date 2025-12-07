import { Account } from "../../../models/Banking";
import { useBaseForm, ValidationRule, BaseFormData } from "./useBaseForm";

interface TransferData extends BaseFormData {
  amount: string;
}

const createTransferValidationRules = (): ValidationRule<Account[]>[] => [
  {
    field: "from_account_id",
    validator: (value) =>
      !value ? "Please select a source account" : undefined,
  },
  {
    field: "to_account_id",
    validator: (value, formData) => {
      if (!value) return "Please select a destination account";
      if (value === formData.from_account_id) {
        return "Source and destination accounts must be different";
      }
      return undefined;
    },
  },
  {
    field: "amount",
    validator: (value, formData, accountsContext) => {
      const amount = parseFloat(value);
      if (!value || isNaN(amount) || amount <= 0) {
        return "Please enter a valid positive amount";
      }

      if (formData.from_account_id && !isNaN(amount) && amount > 0) {
        const fromAccount = accountsContext?.find(
          (acc) => acc.id === formData.from_account_id
        );
        if (fromAccount && amount > fromAccount.balance) {
          return "Insufficient funds for this transfer";
        }
      }

      return undefined;
    },
  },
];

export const useTransferForm = (accounts: Account[]) => {
  const initialData: TransferData = {
    from_account_id: "",
    to_account_id: "",
    amount: "",
    description: "",
  };

  const validationRules = createTransferValidationRules();

  return useBaseForm(initialData, validationRules, accounts);
};
