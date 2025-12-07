import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Account, TransferRequest, Currency } from "../../../../models/Banking";
import { accountsApi } from "../../../../api/accounts";
import { useToast } from "../../../../hooks/useToast";
import Button from "../../../../components/ui/Button/Button";
import AccountSelect from "../../../../components/ui/AccountSelect/AccountSelect";
import FormField from "../../../../components/ui/FormField/FormField";
import ErrorAlert from "../../../../components/ui/ErrorAlert/ErrorAlert";
import ConfirmationModal from "../../../../components/ui/ConfirmationModal";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import { useTransferForm } from "../../hooks/useTransferForm";
import { formatCurrency } from "../../../../utils/formatters";
import { CURRENCY_PRECISION } from "../../../../utils/constants";
import { useDashboard } from "../../../accounts/hooks/useDashboard";
import { ToastContainer } from "../../../../components/ui/Toast/Toast";

const TransferPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingTransfer, setPendingTransfer] =
    useState<TransferRequest | null>(null);

  const navigate = useNavigate();
  const { showToast, toasts, dismissToast } = useToast();
  const { handleTransfer } = useDashboard();

  const {
    formData,
    errors,
    updateField,
    validateForm,
    resetForm,
    setGeneralError,
  } = useTransferForm(accounts);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsData = await accountsApi.getUserAccounts();
      setAccounts(accountsData);
    } catch (_err) {
      showToast("Failed to load accounts", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

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

    setSubmitting(true);

    try {
      await handleTransfer(pendingTransfer);
      setShowConfirmation(false);
      showToast(
        `Transfer of ${formatCurrency(
          pendingTransfer.amount,
          currency
        )} completed successfully!`,
        { type: "success" }
      );
      resetForm();
      setTimeout(() => navigate("/transactions"), 2000);
    } catch (err: any) {
      setShowConfirmation(false);
      const errorMessage =
        err.response?.data?.message || "Transfer failed. Please try again.";
      setGeneralError(errorMessage);
      showToast(errorMessage, { type: "error" });
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/transactions")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Transfer</h1>
            <p className="text-gray-600 mt-1">Send money to another account</p>
          </div>
        </div>

        {fromAccount && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Available Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(fromAccount.balance, fromAccount.currency)}
            </p>
          </div>
        )}
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && <ErrorAlert message={errors.general} />}

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
            <Button
              variant="secondary"
              onClick={() => navigate("/transactions")}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Review Transfer
            </Button>
          </div>
        </form>
      </div>

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
        isLoading={submitting}
      />
    </div>
  );
};

export default TransferPage;
