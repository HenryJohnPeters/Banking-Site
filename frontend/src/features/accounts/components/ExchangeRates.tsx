import Card from "../../../components/ui/Card/Card";

interface ExchangeRatesProps {
  rates: {
    USD_TO_EUR: number;
    EUR_TO_USD: number;
  };
}

const ExchangeRates = ({ rates }: ExchangeRatesProps) => {
  return (
    <Card>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Current Exchange Rates
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">USD to EUR</p>
          <p className="text-xl font-semibold">{rates.USD_TO_EUR}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">EUR to USD</p>
          <p className="text-xl font-semibold">{rates.EUR_TO_USD}</p>
        </div>
      </div>
    </Card>
  );
};

export default ExchangeRates;
