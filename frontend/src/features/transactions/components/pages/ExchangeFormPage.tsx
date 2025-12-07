import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Account, ExchangeRequest } from "../../../../models/Banking";
import { accountsApi } from "../../../../api/accounts";
import { useToast } from "../../../../hooks/useToast";
import Button from "../../../../components/ui/Button/Button";
import AccountSelect from "../../../../components/ui/AccountSelect/AccountSelect";
import FormField from "../../../../components/ui/FormField/FormField";
import ExchangePreview from "../ui/ExchangePreview";
import ErrorAlert from "../../../../components/ui/ErrorAlert/ErrorAlert";
import ConfirmationModal from "../../../../components/ui/ConfirmationModal";
import LoadingSpinner from "../../../../components/ui/LoadingSpinner";
import { useExchangeForm } from "../../hooks/useExchangeForm";
import { formatCurrency } from "../../../../utils/formatters";
import { CURRENCY_PRECISION } from "../../../../utils/constants";
import { useDashboard } from "../../../accounts/hooks/useDashboard";
import { ToastContainer } from "../../../../components/ui/Toast/Toast";

const ExchangeFormPage = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingExchange, setPendingExchange] =
    useState<ExchangeRequest | null>(null);

  const navigate = useNavigate();
  const { showToast, toasts, dismissToast } = useToast();
  const { exchangeRates, handleExchange } = useDashboard();

  const {
    formData,
    errors,
    exchangePreview,
    updateField,
    validateForm,
    resetForm,
    setGeneralError,
  } = useExchangeForm(
    accounts,
    exchangeRates || { USD_TO_EUR: 0, EUR_TO_USD: 0 }
  );

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
    if (!exchangeRates) {
      setGeneralError("Exchange rates not available. Please try again.");
      return;
    }

    const fromAccount = accounts.find(
      (acc) => acc.id === formData.from_account_id
    )!;
    const toAccount = accounts.find(
      (acc) => acc.id === formData.to_account_id
    )!;

    const rateKey = `${fromAccount.currency}_TO_${toAccount.currency}`;
    const rate = exchangeRates[rateKey as keyof typeof exchangeRates];

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

    setSubmitting(true);

    try {
      await handleExchange(pendingExchange);
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
      setTimeout(() => navigate("/exchange"), 2000);
    } catch (err: any) {
      setShowConfirmation(false);
      const errorMessage =
        err.response?.data?.message || "Exchange failed. Please try again.";
      setGeneralError(errorMessage);
      showToast(errorMessage, { type: "error" });
    } finally {
      setSubmitting(false);
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
          parseFloat(exchangePreview.toAmount.toString()),
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!exchangeRates) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate("/exchange")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Currency Exchange
            </h1>
          </div>
        </div>
        <ErrorAlert message="Exchange rates are not available at the moment. Please try again later." />
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
            onClick={() => navigate("/exchange")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Currency Exchange
            </h1>
            <p className="text-gray-600 mt-1">
              Convert currencies at live market rates
            </p>
          </div>
        </div>

        {formData.from_account_id &&
          (() => {
            const fromAccount = accounts.find(
              (acc) => acc.id === formData.from_account_id
            );
            return fromAccount ? (
              <div className="text-right">
                <p className="text-sm text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(fromAccount.balance, fromAccount.currency)}
                </p>
              </div>
            ) : null;
          })()}
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
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Exchange Preview
              </h3>
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
            <Button
              variant="secondary"
              onClick={() => navigate("/exchange")}
              type="button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex items-center gap-2"
              disabled={!exchangePreview}
            >
              <RefreshCw className="h-4 w-4" />
              Review Exchange
            </Button>
          </div>
        </form>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirm}
        title="Confirm Exchange"
        message="You are about to exchange the following currencies. Please verify the exchange rate and amounts."
        details={getConfirmationDetails()}
        confirmText="Confirm Exchange"
        isLoading={submitting}
      />
    </div>
  );
};

export default ExchangeFormPage;
