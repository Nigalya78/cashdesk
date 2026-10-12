export type ShiftStatus = 'active' | 'completed';

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'cashier';
}

export interface Shift {
  id: string;
  cashier_id: string;
  cashier_name: string;
  shift_date: string;
  login_time: string;
  end_time: string | null;
  status: ShiftStatus;
  opening_cash_in: number;
  total_entries_cash: number;
  total_card: number;
  total_cash_out: number;
  total_cash_in_returns: number;
  cash_balance: number;
  entry_count: number;
  cash_out_count: number;
}

export interface TransactionDenomination {
  id: string;
  denomination: number;
  quantity: number;
  amount: number;
}

export interface Entry {
  id: string;
  shift_id: string;
  entry_name: string;
  transaction_date: string;
  cash_in: number;
  card_amount: number;
  denominations: TransactionDenomination[];
  created_at: string;
}

export interface CashOut {
  id: string;
  shift_id: string;
  amount: number;
  note: string;
  created_at: string;
}

export interface CashInReturn {
  id: string;
  cash_out_id: string;
  shift_id: string;
  cashier_id: string;
  amount: number;
  note: string;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
export type DenomValue = (typeof DENOMINATIONS)[number];

export interface DenomEntry {
  denomination: DenomValue;
  quantity: string;
}
