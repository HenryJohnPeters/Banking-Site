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
  return (
    <div className="bg-gray-50 p-3 rounded-md">
      <p className="text-sm text-gray-600">Exchange Preview:</p>
      <p className="text-sm font-medium">
        {fromAmount} {fromCurrency} → {toAmount} {toCurrency}
      </p>
      <p className="text-xs text-gray-500">
        Rate: 1 {fromCurrency} = {rate} {toCurrency}
      </p>
    </div>
  );
};

export default ExchangePreview;
