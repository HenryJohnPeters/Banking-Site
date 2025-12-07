import { TrendingUp, Clock } from "lucide-react";
import { formatCurrency } from "../../../../utils/formatters";
import { Currency } from "../../../../models/Banking";

interface ExchangePreviewProps {
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  rate: number;
}

const ExchangePreview = ({
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  rate,
}: ExchangePreviewProps) => {
  const fromAmountNum = parseFloat(fromAmount);
  const toAmountNum = parseFloat(toAmount);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Exchange Preview
        </h4>
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <Clock className="h-3 w-3" />
          Live Rate
        </div>
      </div>

      <div className="grid grid-cols-3 items-center gap-4">
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">You Send</div>
          <div className="font-semibold text-gray-900">
            {formatCurrency(fromAmountNum, fromCurrency as Currency)}
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl">→</div>
          <div className="text-xs text-blue-600 mt-1 font-medium">
            @ {rate} {toCurrency}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">You Receive</div>
          <div className="font-semibold text-green-600">
            {formatCurrency(toAmountNum, toCurrency as Currency)}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-blue-200">
        <div className="text-xs text-blue-700 flex justify-between">
          <span>Exchange Rate:</span>
          <span className="font-medium">
            1 {fromCurrency} = {rate} {toCurrency}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExchangePreview;
