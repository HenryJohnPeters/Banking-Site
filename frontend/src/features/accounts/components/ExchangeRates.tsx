interface ExchangeRatesProps {
  rates: {
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  };
}

const ExchangeRates = ({ rates }: ExchangeRatesProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">USD → EUR</p>
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-700 font-bold text-sm">$</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{rates.USD_TO_EUR}</p>
        <p className="text-xs text-gray-600 mt-1">US Dollar to Euro</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">EUR → USD</p>
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-700 font-bold text-sm">€</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{rates.EUR_TO_USD}</p>
        <p className="text-xs text-gray-600 mt-1">Euro to US Dollar</p>
      </div>
    </div>
  );
};

export default ExchangeRates;
