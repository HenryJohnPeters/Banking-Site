import { Account } from "../../../models/Banking";
import AccountCard from "./AccountCard";

interface AccountsGridProps {
  accounts: Account[];
}

const AccountsGrid = ({ accounts }: AccountsGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {accounts.map((account) => (
        <AccountCard key={account.id} account={account} />
      ))}
    </div>
  );
};

export default AccountsGrid;
