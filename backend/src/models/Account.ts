export enum Currency {
  USD = "USD",
  EUR = "EUR",
}

export interface Account {
  id: string;
  user_id: string;
  currency: Currency;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

export interface AccountBalance {
  account_id: string;
  balance: number;
  last_updated: Date;
}
