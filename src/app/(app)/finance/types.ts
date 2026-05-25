export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  currency: string;
  balance_local: number;
  exchange_rate_to_usd: number;
  balance_usd: number | null;
  last_updated: string | null;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  name: string;
  cost_usd: number;
  cycle: string | null;
  renewal_date: string | null;
  account_id: string | null;
  category: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Purchase = {
  id: string;
  user_id: string;
  item_name: string;
  cost_usd: number;
  date: string;
  category: string | null;
  account_id: string | null;
  net_worth_percentage: number | null;
  created_at: string;
  updated_at: string;
};

export type WishListItem = {
  id: string;
  user_id: string;
  item_name: string;
  estimated_cost_usd: number | null;
  priority: string | null;
  link: string | null;
  image_url: string | null;
  saved_amount: number;
  created_at: string;
  updated_at: string;
};

export type IncomeLog = {
  id: string;
  user_id: string;
  amount_usd: number;
  source: string | null;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export const ACCOUNT_TYPES = ['Checking', 'Savings', 'Investment', 'Crypto', 'Cash', 'Credit', 'Other'] as const;
export const SUB_CYCLES = ['Monthly', 'Yearly', 'Weekly', 'Quarterly'] as const;
export const PURCHASE_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Tech', 'Clothing', 'Education', 'Home', 'Travel', 'Other'] as const;
export const PRIORITIES = ['Low', 'Medium', 'High'] as const;
