import React, { useState } from "react";
import { Account, ExchangeRequest } from "../../../../models/Banking";
import { useToast } from "../../../../hooks/useToast";
import Button from "../../../../components/ui/Button/Button";
import AccountSelect from "../../../../components/ui/AccountSelect/AccountSelect";
import FormField from "../../../../components/ui/FormField/FormField";
import ExchangePreview from "../ui/ExchangePreview";
import ErrorAlert from "../../../../components/ui/ErrorAlert/ErrorAlert";
import ConfirmationModal from "../../../../components/ui/ConfirmationModal";
import { useExchangeForm } from "../../hooks/useExchangeForm";
import { formatCurrency } from "../../../../utils/formatters";
import { CURRENCY_PRECISION } from "../../../../utils/constants";
import { RefreshCw } from "lucide-react";

interface ExchangeFormProps {
  accounts: Account[];
  exchangeRates: {
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  };
  onSubmit: (data: ExchangeRequest) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
  cancelButtonText?: string;
  showAvailableBalance?: boolean;
}

const ExchangeForm = ({
  accounts,
  exchangeRates,
  onSubmit,
  onCancel,
  submitButtonText = "Review Exchange",
  cancelButtonText = "Cancel",
  showAvailableBalance = false,
}: ExchangeFormProps) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingExchange, setPendingExchange] =
    useState<ExchangeRequest | null>(null);

  const { showToast } = useToast();

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

    const fromAccount = accounts.find(
      (acc) => acc.id === formData.from_account_id
    )!;
    const toAccount = accounts.find(
      (acc) => acc.id === formData.to_account_id
    )!;

    const rateKey =
      `${fromAccount.currency}_TO_${toAccount.currency}` as keyof typeof exchangeRates;
    const rate = exchangeRates[rateKey];

    if (!rate) {
      setGeneralError(
        `Exchange rate for ${fromAccount.currency} to ${toAccount.currency} not available`
      );
      return;
    }

    const exchangeData: ExchangeRequest = {
      from_account_id: formData.from_account_id,
      to_account_id: formData.to_account_id,
      from_amount: Math.round(parseFloat(formData.from_amount) * 100) / 100,
      exchange_rate: rate,
      description:
        formData.description ||
        `Exchange ${fromAccount.currency} to ${toAccount.currency}`,
    };

    setPendingExchange(exchangeData);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!pendingExchange) return;

    setLoading(true);

    try {
      await onSubmit(pendingExchange);
      setShowConfirmation(false);

      const fromAccount = accounts.find(
        (acc) => acc.id === pendingExchange.from_account_id
      )!;
      const toAccount = accounts.find(
        (acc) => acc.id === pendingExchange.to_account_id
      )!;

      showToast(
        `Exchanged ${formatCurrency(
          pendingExchange.from_amount,
          fromAccount.currency
        )} to ${toAccount.currency} successfully!`,
        { type: "success" }
      );
      resetForm();
    } catch (err: any) {
      setShowConfirmation(false);
      const errorMessage =
        err.response?.data?.message || "Exchange failed. Please try again.";
      setGeneralError(errorMessage);
      showToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
      setPendingExchange(null);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingExchange(null);
  };

  const getConfirmationDetails = () => {
    if (!pendingExchange || !exchangePreview) return [];

    return [
      {
        label: "From",
        value: `${formatCurrency(
          pendingExchange.from_amount,
          exchangePreview.fromCurrency
        )}`,
      },
      {
        label: "To",
        value: `${formatCurrency(
          parseFloat(exchangePreview.toAmount),
          exchangePreview.toCurrency
        )}`,
      },
      {
        label: "Exchange Rate",
        value: `1 ${exchangePreview.fromCurrency} = ${exchangePreview.rate} ${exchangePreview.toCurrency}`,
      },
      {
        label: "Description",
        value: pendingExchange.description || "N/A",
      },
    ];
  };

  const fromAccount = accounts.find(
    (acc) => acc.id === formData.from_account_id
  );

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
          </div>

          <div>
            <FormField
              label="Amount to Exchange"
              type="number"
              value={formData.from_amount}
              onChange={(value) => updateField("from_amount", value)}
              placeholder="0.00"
              step={CURRENCY_PRECISION.DECIMAL_STEP.toString()}
              required
              error={errors.from_amount}
            />
            <p className="text-sm text-gray-500 mt-1">
              Live rates updated in real-time
            </p>
          </div>

          <div>
            <FormField
              label="Description (Optional)"
              value={formData.description}
              onChange={(value) => updateField("description", value)}
              placeholder="Enter a description for this exchange"
            />
          </div>
        </div>

        {/* Exchange Preview */}
        {exchangePreview && (
          <div className="mt-6">
            <ExchangePreview
              fromAmount={formData.from_amount}
              fromCurrency={exchangePreview.fromCurrency}
              toAmount={exchangePreview.toAmount}
              toCurrency={exchangePreview.toCurrency}
              rate={exchangePreview.rate}
            />
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} type="button">
              {cancelButtonText}
            </Button>
          )}
          <Button
            type="submit"
            className="flex items-center gap-2"
            disabled={!exchangePreview}
          >
            <RefreshCw className="h-4 w-4" />
            {submitButtonText}
          </Button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirm}
        title="Confirm Exchange"
        message="You are about to exchange the following currencies. Please verify the exchange rate and amounts."
        details={getConfirmationDetails()}
        confirmText="Confirm Exchange"
        isLoading={loading}
      />
    </>
  );
};

export default ExchangeForm;
