import Button from "../../../components/ui/Button/Button";

interface DashboardHeaderProps {
  onTransferClick: () => void;
  onExchangeClick: () => void;
}

const DashboardHeader = ({
  onTransferClick,
  onExchangeClick,
}: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-gray-900">Account Overview</h2>
      <div className="flex space-x-3">
        <Button onClick={onTransferClick}>Transfer</Button>
        <Button variant="success" onClick={onExchangeClick}>
          Exchange
        </Button>
      </div>
    </div>
  );
};

export default DashboardHeader;
