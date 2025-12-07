import React, { useState } from "react";
import { Account, TransferRequest } from "../../../models/Banking";
import Modal from "../../../components/ui/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import AccountSelect from "../../../components/ui/AccountSelect/AccountSelect";
import FormField from "../../../components/ui/FormField/FormField";
import ErrorAlert from "../../../components/ui/ErrorAlert/ErrorAlert";
import { useTransferForm } from "../hooks/useTransferForm";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSubmit: (data: TransferRequest) => Promise<void>;
}

const TransferModal = ({
  isOpen,
  onClose,
  accounts,
  onSubmit,
}: TransferModalProps) => {
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);

      if (amount > 999999.99) {
        setGeneralError("Transfer amount cannot exceed $999,999.99");
        setLoading(false);
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

      await onSubmit(transferData);
      handleClose();
    } catch (err: any) {
      setGeneralError(
        err.response?.data?.message || "Transfer failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Transfer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <ErrorAlert message={errors.general} />}

        <AccountSelect
          label="From Account"
          value={formData.from_account_id}
          onChange={(value) => updateField("from_account_id", value)}
          accounts={accounts}
          placeholder="Select account"
          required
          error={errors.from_account_id}
        />

        <FormField
          label="To Account ID"
          value={formData.to_account_id}
          onChange={(value) => updateField("to_account_id", value)}
          placeholder="Enter recipient account ID"
          required
          error={errors.to_account_id}
        />

        <FormField
          label="Amount"
          type="number"
          value={formData.amount}
          onChange={(value) => updateField("amount", value)}
          placeholder="0.00"
          step="0.01"
          required
          error={errors.amount}
        />

        <FormField
          label="Description (Optional)"
          value={formData.description}
          onChange={(value) => updateField("description", value)}
          placeholder="Payment description"
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransferModal;
