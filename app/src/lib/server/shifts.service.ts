import pool from './database';
import { Shift, ShiftSummary, ShiftFilter } from './types';
import { todayDateString } from './dateUtils';

// ─── Shared summary query helper ──────────────────────────────────────────────

const SUMMARY_SELECT = `
  SELECT
    s.*,
    u.name        AS cashier_name,
    u.username    AS cashier_username,
    COALESCE((
      SELECT t_latest.cash_in
      FROM transactions t_latest
      WHERE t_latest.shift_id = s.id
      ORDER BY t_latest.created_at DESC
      LIMIT 1
    ), 0) AS total_entries_cash,
    COALESCE((
      SELECT t_latest.card_amount
      FROM transactions t_latest
      WHERE t_latest.shift_id = s.id
      ORDER BY t_latest.created_at DESC
      LIMIT 1
    ), 0) AS total_card,
    COALESCE((
      SELECT SUM(co.amount) FROM cash_outs co WHERE co.shift_id = s.id
    ), 0) AS total_cash_out,
    COALESCE((
      SELECT SUM(cir.amount) FROM cash_in_returns cir WHERE cir.shift_id = s.id
    ), 0) AS total_cash_in_returns,
    s.opening_cash_in
    + COALESCE((
      SELECT t_l.cash_in FROM transactions t_l WHERE t_l.shift_id = s.id ORDER BY t_l.created_at DESC LIMIT 1
    ), 0)
    + COALESCE((
      SELECT t_l.card_amount FROM transactions t_l WHERE t_l.shift_id = s.id ORDER BY t_l.created_at DESC LIMIT 1
    ), 0)
    - COALESCE((
      SELECT SUM(co.amount) FROM cash_outs co WHERE co.shift_id = s.id
    ), 0)
    + COALESCE((
      SELECT SUM(cir.amount) FROM cash_in_returns cir WHERE cir.shift_id = s.id
    ), 0) AS cash_balance,
    (SELECT COUNT(*) FROM transactions WHERE shift_id = s.id) AS entry_count,
    COALESCE((
      SELECT COUNT(*) FROM cash_outs co WHERE co.shift_id = s.id
    ), 0) AS cash_out_count
  FROM shifts s
  JOIN users u ON u.id = s.cashier_id
`;

// ─── Cashier Operations ───────────────────────────────────────────────────────

export async function openShift(cashierId: string): Promise<Shift> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM shifts WHERE cashier_id = $1 AND status = 'active' LIMIT 1`,
      [cashierId]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      throw new Error('You already have an active shift.');
    }
    const result = await client.query<Shift>(
      `INSERT INTO shifts (cashier_id, shift_date, login_time, status, opening_cash_in)
       VALUES ($1, $2, NOW(), 'active', 0)
       RETURNING *`,
      [cashierId, todayDateString()]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getActiveShift(cashierId: string): Promise<ShiftSummary | null> {
  const result = await pool.query<ShiftSummary>(
    `${SUMMARY_SELECT}
     WHERE s.cashier_id = $1 AND s.status = 'active'
     LIMIT 1`,
    [cashierId]
  );
  if (!result.rowCount || result.rowCount === 0) return null;
  return result.rows[0];
}

/**
 * Update the opening Cash In amount for an active shift.
 */
export async function updateOpeningCashIn(
  shiftId: string,
  cashierId: string,
  amount: number
): Promise<ShiftSummary> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query<{ status: string }>(
      `SELECT status FROM shifts WHERE id = $1 AND cashier_id = $2 LIMIT 1`,
      [shiftId, cashierId]
    );
    if (!check.rowCount || check.rowCount === 0) throw new Error('Shift not found.');
    if (check.rows[0].status !== 'active') throw new Error('Cannot edit a completed shift.');

    await client.query(
      `UPDATE shifts SET opening_cash_in = $1, updated_at = NOW() WHERE id = $2`,
      [amount, shiftId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const result = await pool.query<ShiftSummary>(
    `${SUMMARY_SELECT} WHERE s.id = $1`,
    [shiftId]
  );
  return result.rows[0];
}

export async function endShift(shiftId: string, cashierId: string): Promise<ShiftSummary> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query<Shift>(
      `SELECT * FROM shifts WHERE id = $1 AND cashier_id = $2 AND status = 'active' LIMIT 1`,
      [shiftId, cashierId]
    );
    if (!check.rowCount || check.rowCount === 0) throw new Error('No active shift found.');
    await client.query(
      `UPDATE shifts SET status = 'completed', end_time = NOW(), updated_at = NOW() WHERE id = $1`,
      [shiftId]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const result = await pool.query<ShiftSummary>(
    `${SUMMARY_SELECT} WHERE s.id = $1`,
    [shiftId]
  );
  return result.rows[0];
}

export async function getCashierShifts(
  cashierId: string,
  fromDate?: string,
  toDate?: string
): Promise<ShiftSummary[]> {
  const params: (string | undefined)[] = [cashierId];
  let where = `WHERE s.cashier_id = $1`;
  if (fromDate) { params.push(fromDate); where += ` AND s.shift_date >= $${params.length}`; }
  if (toDate)   { params.push(toDate);   where += ` AND s.shift_date <= $${params.length}`; }

  const result = await pool.query<ShiftSummary>(
    `${SUMMARY_SELECT} ${where} ORDER BY s.shift_date DESC, s.login_time DESC`,
    params
  );
  return result.rows;
}

export async function getAllShifts(filter: ShiftFilter): Promise<ShiftSummary[]> {
  const params: (string | undefined)[] = [];
  const conditions: string[] = [];
  if (filter.cashier_id) { params.push(filter.cashier_id); conditions.push(`s.cashier_id = $${params.length}`); }
  if (filter.from_date)  { params.push(filter.from_date);  conditions.push(`s.shift_date >= $${params.length}`); }
  if (filter.to_date)    { params.push(filter.to_date);    conditions.push(`s.shift_date <= $${params.length}`); }
  if (filter.status && filter.status !== 'all') { params.push(filter.status); conditions.push(`s.status = $${params.length}`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query<ShiftSummary>(
    `${SUMMARY_SELECT} ${where} ORDER BY s.shift_date DESC, s.login_time DESC`,
    params
  );
  return result.rows;
}

export async function getShiftById(shiftId: string): Promise<ShiftSummary | null> {
  const result = await pool.query<ShiftSummary>(
    `${SUMMARY_SELECT} WHERE s.id = $1`,
    [shiftId]
  );
  if (!result.rowCount || result.rowCount === 0) return null;
  return result.rows[0];
}
