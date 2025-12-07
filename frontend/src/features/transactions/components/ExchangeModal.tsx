import React, { useState } from "react";
import { Account, ExchangeRequest } from "../../../models/Banking";
import Modal from "../../../components/ui/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import AccountSelect from "../../../components/ui/AccountSelect/AccountSelect";
import FormField from "../../../components/ui/FormField/FormField";
import ExchangePreview from "./ExchangePreview";
import ErrorAlert from "../../../components/ui/ErrorAlert/ErrorAlert";
import { useExchangeForm } from "../hooks/useExchangeForm";

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  exchangeRates: {
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  };
  onSubmit: (data: ExchangeRequest) => Promise<void>;
}

const ExchangeModal = ({
  isOpen,
  onClose,
  accounts,
  exchangeRates,
  onSubmit,
}: ExchangeModalProps) => {
  const [loading, setLoading] = useState(false);

  const {
    formData,
    errors,
    exchangePreview,
    updateField,
    validateForm,
    resetForm,
    setGeneralError,
  } = useExchangeForm(accounts, exchangeRates);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const fromAccount = accounts.find(
        (acc) => acc.id === formData.from_account_id
      )!;
      const toAccount = accounts.find(
        (acc) => acc.id === formData.to_account_id
      )!;

      const rate =
        fromAccount.currency === "USD"
          ? exchangeRates.USD_TO_EUR
          : exchangeRates.EUR_TO_USD;

      const exchangeData: ExchangeRequest = {
        from_account_id: formData.from_account_id,
        to_account_id: formData.to_account_id,
        from_amount: Math.round(parseFloat(formData.from_amount) * 100) / 100,
        exchange_rate: rate,
        description:
          formData.description ||
          `Exchange ${fromAccount.currency} to ${toAccount.currency}`,
      };

      await onSubmit(exchangeData);
      handleClose();
    } catch (err: any) {
      setGeneralError(
        err.response?.data?.message || "Exchange failed. Please try again."
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Currency Exchange">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && <ErrorAlert message={errors.general} />}

        <AccountSelect
          label="From Account"
          value={formData.from_account_id}
          onChange={(value) => updateField("from_account_id", value)}
          accounts={accounts}
          placeholder="Select source account"
          required
          error={errors.from_account_id}
        />

        <AccountSelect
          label="To Account"
          value={formData.to_account_id}
          onChange={(value) => updateField("to_account_id", value)}
          accounts={accounts}
          placeholder="Select destination account"
          excludeAccountId={formData.from_account_id}
          required
          error={errors.to_account_id}
        />

        <FormField
          label="Amount"
          type="number"
          value={formData.from_amount}
          onChange={(value) => updateField("from_amount", value)}
          placeholder="0.00"
          step="0.01"
          required
          error={errors.from_amount}
        />

        {exchangePreview && (
          <ExchangePreview
            fromAmount={formData.from_amount}
            fromCurrency={exchangePreview.fromCurrency}
            toAmount={exchangePreview.toAmount}
            toCurrency={exchangePreview.toCurrency}
            rate={exchangePreview.rate}
          />
        )}

        <FormField
          label="Description (Optional)"
          value={formData.description}
          onChange={(value) => updateField("description", value)}
          placeholder="Exchange description"
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="success" type="submit" loading={loading}>
            Exchange
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ExchangeModal;
