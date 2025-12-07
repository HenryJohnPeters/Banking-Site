export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_id: string;
  amount: number; // Positive for credits, negative for debits
  type: string; // CREDIT or DEBIT
  description: string;
  created_at: Date;
}

export interface LedgerEntryInput {
  transaction_id: string;
  account_id: string;
  amount: number;
  type: string; // CREDIT or DEBIT
  description: string;
}

// For ensuring ledger balance validation
export interface LedgerBalance {
  account_id: string;
  total_amount: number;
}
