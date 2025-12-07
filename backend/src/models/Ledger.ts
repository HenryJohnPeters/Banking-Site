export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  amount: number; // Positive for debits, negative for credits
  description: string;
  created_at: Date;
}

export interface LedgerEntryInput {
  transaction_id: string;
  account_id: string;
  amount: number;
  description: string;
}

// For ensuring ledger balance validation
export interface LedgerBalance {
  account_id: string;
  total_amount: number;
}
