export type UserRole   = 'cashier';
export type UserStatus = 'active' | 'inactive';
export type ShiftStatus = 'active' | 'completed';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  cashier_id: string;
  cashier_name: string;
  cashier_username: string;
  shift_date: string;
  login_time: string;
  end_time: string | null;
  status: ShiftStatus;
  // Opening float — entered once
  opening_cash_in: number;
  // Computed from named entries
  total_entries_cash: number;
  total_card: number;
  // Computed from cash_outs table
  total_cash_out: number;
  // opening_cash_in + total_entries_cash - total_cash_out
  cash_balance: number;
  entry_count: number;
  cash_out_count: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionDenomination {
  id: string;
  transaction_id: string;
  denomination: number;
  quantity: number;
  amount: number;
}

export interface Entry {
  id: string;
  shift_id: string;
  cashier_id: string;
  entry_name: string;
  transaction_date: string;
  cash_in: number;
  cash_out: number;
  card_amount: number;
  denominations: TransactionDenomination[];
  created_at: string;
  updated_at: string;
}

export interface CashOut {
  id: string;
  shift_id: string;
  cashier_id: string;
  amount: number;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}
