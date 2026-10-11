// ─── User Types ──────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'cashier';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

// ─── Shift Types ─────────────────────────────────────────────────────────────

export type ShiftStatus = 'active' | 'completed';

export interface Shift {
  id: string;
  cashier_id: string;
  shift_date: string;
  login_time: Date;
  end_time: Date | null;
  status: ShiftStatus;
  opening_cash_in: number;
  created_at: Date;
  updated_at: Date;
}

export interface ShiftSummary extends Shift {
  cashier_name: string;
  cashier_username: string;
  // sum of denomination entries (cash_in from transactions)
  total_entries_cash: number;
  // sum of card amounts from entries
  total_card: number;
  // sum of all cash outs
  total_cash_out: number;
  // opening_cash_in + total_entries_cash - total_cash_out
  cash_balance: number;
  entry_count: number;
  cash_out_count: number;
}

// ─── Entry (Transaction) Types ────────────────────────────────────────────────

export interface Transaction {
  id: string;
  shift_id: string;
  cashier_id: string;
  entry_name: string;
  transaction_date: string;
  cash_in: number;      // sum of denominations
  cash_out: number;     // kept for DB compatibility, always 0 for entries
  card_amount: number;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionWithDenominations extends Transaction {
  denominations: TransactionDenomination[];
}

// ─── Denomination Types ───────────────────────────────────────────────────────

export const VALID_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;
export type DenominationValue = (typeof VALID_DENOMINATIONS)[number];

export interface TransactionDenomination {
  id: string;
  transaction_id: string;
  denomination: DenominationValue;
  quantity: number;
  amount: number;
}

// ─── Cash Out Types ───────────────────────────────────────────────────────────

export interface CashOut {
  id: string;
  shift_id: string;
  cashier_id: string;
  amount: number;
  note: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

// ─── API Response Types ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface DateRangeFilter {
  from_date?: string;
  to_date?: string;
}

export interface ShiftFilter extends DateRangeFilter {
  cashier_id?: string;
  status?: ShiftStatus | 'all';
}
