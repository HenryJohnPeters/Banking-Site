import React, { useState } from "react";
import { Account, TransferRequest, Currency } from "../../../../models/Banking";
import { useToast } from "../../../../hooks/useToast";
import Button from "../../../../components/ui/Button/Button";
import AccountSelect from "../../../../components/ui/AccountSelect/AccountSelect";
import FormField from "../../../../components/ui/FormField/FormField";
import ErrorAlert from "../../../../components/ui/ErrorAlert/ErrorAlert";
import ConfirmationModal from "../../../../components/ui/ConfirmationModal";
import { useTransferForm } from "../../hooks/useTransferForm";
import { formatCurrency } from "../../../../utils/formatters";
import { CURRENCY_PRECISION } from "../../../../utils/constants";
import { Send } from "lucide-react";

interface TransferFormProps {
  accounts: Account[];
  onSubmit: (data: TransferRequest) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
  cancelButtonText?: string;
  showAvailableBalance?: boolean;
}

const TransferForm = ({
  accounts,
  onSubmit,
  onCancel,
  submitButtonText = "Review Transfer",
  cancelButtonText = "Cancel",
  showAvailableBalance = false,
}: TransferFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingTransfer, setPendingTransfer] =
    useState<TransferRequest | null>(null);

  const { showToast } = useToast();

  const {
    formData,
    errors,
    updateField,
    validateForm,
    resetForm,
    setGeneralError,
  } = useTransferForm(accounts);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const amount = parseFloat(formData.amount);

    if (amount > 999999.99) {
      setGeneralError("Transfer amount cannot exceed $999,999.99");
      return;
    }

    const transferData: TransferRequest = {
      from_account_id: formData.from_account_id,
      to_account_id: formData.to_account_id,
      amount: Math.round(amount * 100) / 100,
      description:
        formData.description ||
        `Transfer to ${formData.to_account_id.slice(0, 8)}...`,
    };

    setPendingTransfer(transferData);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!pendingTransfer) return;

    setLoading(true);

    try {
      await onSubmit(pendingTransfer);
      setShowConfirmation(false);

      const fromAccount = accounts.find(
        (acc) => acc.id === pendingTransfer.from_account_id
      );
      const currency = (fromAccount?.currency || "USD") as Currency;

      showToast(
        `Transfer of ${formatCurrency(
          pendingTransfer.amount,
          currency
        )} completed successfully!`,
        { type: "success" }
      );
      resetForm();
    } catch (err: any) {
      setShowConfirmation(false);
      const errorMessage =
        err.response?.data?.message || "Transfer failed. Please try again.";
      setGeneralError(errorMessage);
      showToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
      setPendingTransfer(null);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingTransfer(null);
  };

  const fromAccount = accounts.find(
    (acc) => acc.id === formData.from_account_id
  );
  const currency = (fromAccount?.currency || "USD") as Currency;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && <ErrorAlert message={errors.general} />}

        {showAvailableBalance && fromAccount && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 mb-1">Available Balance</p>
            <p className="text-xl font-bold text-blue-900">
              {formatCurrency(fromAccount.balance, fromAccount.currency)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <AccountSelect
              label="From Account"
              value={formData.from_account_id}
              onChange={(value) => updateField("from_account_id", value)}
              accounts={accounts}
              placeholder="Select source account"
              required
              error={errors.from_account_id}
            />
          </div>

          <div>
            <FormField
              label="To Account ID"
              value={formData.to_account_id}
              onChange={(value) => updateField("to_account_id", value)}
              placeholder="Enter recipient account ID"
              required
              error={errors.to_account_id}
            />
          </div>

          <div>
            <FormField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(value) => updateField("amount", value)}
              placeholder="0.00"
              step={CURRENCY_PRECISION.DECIMAL_STEP.toString()}
              required
              error={errors.amount}
            />
            <p className="text-sm text-gray-500 mt-1">
              Maximum: {formatCurrency(999999.99, currency)}
            </p>
          </div>

          <div>
            <FormField
              label="Description (Optional)"
              value={formData.description}
              onChange={(value) => updateField("description", value)}
              placeholder="Enter a description for this transfer"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} type="button">
              {cancelButtonText}
            </Button>
          )}
          <Button type="submit" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            {submitButtonText}
          </Button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirm}
        title="Confirm Transfer"
        message="You are about to transfer the following amount. Please verify all details before confirming."
        details={[
          {
            label: "Amount",
            value: formatCurrency(pendingTransfer?.amount || 0, currency),
          },
          { label: "To Account", value: pendingTransfer?.to_account_id || "" },
          {
            label: "Description",
            value: pendingTransfer?.description || "N/A",
          },
        ]}
        confirmText="Confirm Transfer"
        isLoading={loading}
      />
    </>
  );
};

export default TransferForm;
