import pool from './database';

export interface DashboardStats {
  total_cash_in: number;
  total_cash_out: number;
  cash_balance: number;
  total_card: number;
  active_shifts: number;
  completed_shifts: number;
  total_cashiers: number;
}

export interface DailyReport {
  report_date: string;
  cashiers: CashierDayReport[];
  totals: {
    total_cash_in: number;
    total_cash_out: number;
    cash_balance: number;
    total_card: number;
  };
}

export interface CashierDayReport {
  cashier_id: string;
  cashier_name: string;
  cashier_username: string;
  shifts: ShiftReport[];
  day_total_cash_in: number;
  day_total_cash_out: number;
  day_cash_balance: number;
  day_total_card: number;
}

export interface ShiftReport {
  shift_id: string;
  login_time: Date;
  end_time: Date | null;
  status: string;
  total_cash_in: number;
  total_cash_out: number;
  cash_balance: number;
  total_card: number;
  transaction_count: number;
}

export interface RangeSummary {
  total_cash_in: number;
  total_cash_out: number;
  cash_balance: number;
  total_card: number;
  total_shifts: number;
  total_transactions: number;
}

// ─── Admin Dashboard Stats ────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const [txStats, shiftStats, cashierCount] = await Promise.all([
    pool.query<{
      total_cash_in: string;
      total_cash_out: string;
      total_card: string;
    }>(
      `SELECT
         COALESCE(SUM(cash_in),  0) AS total_cash_in,
         COALESCE(SUM(cash_out), 0) AS total_cash_out,
         COALESCE(SUM(card_amount), 0) AS total_card
       FROM transactions`
    ),
    pool.query<{ active_shifts: string; completed_shifts: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active')    AS active_shifts,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_shifts
       FROM shifts`
    ),
    pool.query<{ total_cashiers: string }>(
      `SELECT COUNT(*) AS total_cashiers FROM users WHERE role = 'cashier' AND status = 'active'`
    ),
  ]);

  const tx = txStats.rows[0];
  const sh = shiftStats.rows[0];
  const cashIn  = parseFloat(tx.total_cash_in);
  const cashOut = parseFloat(tx.total_cash_out);

  return {
    total_cash_in:     cashIn,
    total_cash_out:    cashOut,
    cash_balance:      cashIn - cashOut,
    total_card:        parseFloat(tx.total_card),
    active_shifts:     parseInt(sh.active_shifts, 10),
    completed_shifts:  parseInt(sh.completed_shifts, 10),
    total_cashiers:    parseInt(cashierCount.rows[0].total_cashiers, 10),
  };
}

// ─── Daily / Date-Range Reports ───────────────────────────────────────────────

/**
 * Returns a structured report grouped by date then cashier.
 * Dates are inclusive on both ends.
 */
export async function getReport(
  fromDate: string,
  toDate: string,
  cashierId?: string
): Promise<DailyReport[]> {
  const params: string[] = [fromDate, toDate];
  let cashierFilter = '';
  if (cashierId) {
    params.push(cashierId);
    cashierFilter = `AND s.cashier_id = $${params.length}`;
  }

  // Aggregate at shift level
  const result = await pool.query<{
    shift_date: string;
    cashier_id: string;
    cashier_name: string;
    cashier_username: string;
    shift_id: string;
    login_time: Date;
    end_time: Date | null;
    status: string;
    total_cash_in: string;
    total_cash_out: string;
    total_card: string;
    transaction_count: string;
  }>(
    `SELECT
       s.shift_date::TEXT,
       u.id              AS cashier_id,
       u.name            AS cashier_name,
       u.username        AS cashier_username,
       s.id              AS shift_id,
       s.login_time,
       s.end_time,
       s.status,
       COALESCE(SUM(t.cash_in),  0) AS total_cash_in,
       COALESCE(SUM(t.cash_out), 0) AS total_cash_out,
       COALESCE(SUM(t.card_amount), 0) AS total_card,
       COUNT(t.id)       AS transaction_count
     FROM shifts s
     JOIN users u ON u.id = s.cashier_id
     LEFT JOIN transactions t ON t.shift_id = s.id
     WHERE s.shift_date >= $1
       AND s.shift_date <= $2
       ${cashierFilter}
     GROUP BY s.shift_date, u.id, u.name, u.username, s.id, s.login_time, s.end_time, s.status
     ORDER BY s.shift_date ASC, u.name ASC`,
    params
  );

  // Group into DailyReport structure
  const dateMap = new Map<string, DailyReport>();

  for (const row of result.rows) {
    if (!dateMap.has(row.shift_date)) {
      dateMap.set(row.shift_date, {
        report_date: row.shift_date,
        cashiers: [],
        totals: { total_cash_in: 0, total_cash_out: 0, cash_balance: 0, total_card: 0 },
      });
    }

    const day = dateMap.get(row.shift_date)!;

    let cashierEntry = day.cashiers.find((c) => c.cashier_id === row.cashier_id);
    if (!cashierEntry) {
      cashierEntry = {
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        cashier_username: row.cashier_username,
        shifts: [],
        day_total_cash_in: 0,
        day_total_cash_out: 0,
        day_cash_balance: 0,
        day_total_card: 0,
      };
      day.cashiers.push(cashierEntry);
    }

    const ci = parseFloat(row.total_cash_in);
    const co = parseFloat(row.total_cash_out);
    const cd = parseFloat(row.total_card);

    cashierEntry.shifts.push({
      shift_id: row.shift_id,
      login_time: row.login_time,
      end_time: row.end_time,
      status: row.status,
      total_cash_in: ci,
      total_cash_out: co,
      cash_balance: ci - co,
      total_card: cd,
      transaction_count: parseInt(row.transaction_count, 10),
    });

    cashierEntry.day_total_cash_in  += ci;
    cashierEntry.day_total_cash_out += co;
    cashierEntry.day_cash_balance    = cashierEntry.day_total_cash_in - cashierEntry.day_total_cash_out;
    cashierEntry.day_total_card     += cd;

    day.totals.total_cash_in  += ci;
    day.totals.total_cash_out += co;
    day.totals.cash_balance    = day.totals.total_cash_in - day.totals.total_cash_out;
    day.totals.total_card     += cd;
  }

  return Array.from(dateMap.values());
}

/**
 * Aggregate totals across a date range.
 */
export async function getRangeSummary(
  fromDate: string,
  toDate: string,
  cashierId?: string
): Promise<RangeSummary> {
  const params: string[] = [fromDate, toDate];
  let cashierFilter = '';
  if (cashierId) {
    params.push(cashierId);
    cashierFilter = `AND s.cashier_id = $${params.length}`;
  }

  const result = await pool.query<{
    total_cash_in: string;
    total_cash_out: string;
    total_card: string;
    total_shifts: string;
    total_transactions: string;
  }>(
    `SELECT
       COALESCE(SUM(t.cash_in),  0)   AS total_cash_in,
       COALESCE(SUM(t.cash_out), 0)   AS total_cash_out,
       COALESCE(SUM(t.card_amount), 0) AS total_card,
       COUNT(DISTINCT s.id)           AS total_shifts,
       COUNT(t.id)                    AS total_transactions
     FROM shifts s
     LEFT JOIN transactions t ON t.shift_id = s.id
     WHERE s.shift_date >= $1
       AND s.shift_date <= $2
       ${cashierFilter}`,
    params
  );

  const row = result.rows[0];
  const ci = parseFloat(row.total_cash_in);
  const co = parseFloat(row.total_cash_out);

  return {
    total_cash_in:      ci,
    total_cash_out:     co,
    cash_balance:       ci - co,
    total_card:         parseFloat(row.total_card),
    total_shifts:       parseInt(row.total_shifts, 10),
    total_transactions: parseInt(row.total_transactions, 10),
  };
}
