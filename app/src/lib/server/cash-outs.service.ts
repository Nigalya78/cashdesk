import pool from './database';
import { CashOut } from './types';

// ─── Create cash out ──────────────────────────────────────────────────────────

export async function createCashOut(
  shiftId: string,
  cashierId: string,
  amount: number,
  note: string
): Promise<CashOut> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const shiftCheck = await client.query<{ status: string; cashier_id: string }>(
      `SELECT status, cashier_id FROM shifts WHERE id = $1 LIMIT 1`, [shiftId]
    );
    if (!shiftCheck.rowCount || shiftCheck.rowCount === 0) throw new Error('Shift not found.');
    if (shiftCheck.rows[0].cashier_id !== cashierId)
      throw new Error('You do not have permission to add cash outs to this shift.');
    if (shiftCheck.rows[0].status !== 'active')
      throw new Error('This shift has already been completed.');

    const result = await client.query<CashOut>(
      `INSERT INTO cash_outs (shift_id, cashier_id, amount, note)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [shiftId, cashierId, amount, note.trim()]
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

// ─── Update cash out ──────────────────────────────────────────────────────────

export async function updateCashOut(
  cashOutId: string,
  cashierId: string,
  amount: number,
  note: string
): Promise<CashOut> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const check = await client.query<{ cashier_id: string; shift_status: string }>(
      `SELECT co.cashier_id, s.status AS shift_status
       FROM cash_outs co JOIN shifts s ON s.id = co.shift_id
       WHERE co.id = $1 LIMIT 1`,
      [cashOutId]
    );
    if (!check.rowCount || check.rowCount === 0) throw new Error('Cash out not found.');
    if (check.rows[0].cashier_id !== cashierId)
      throw new Error('You do not have permission to edit this cash out.');
    if (check.rows[0].shift_status !== 'active')
      throw new Error('You cannot edit a completed shift.');

    const result = await client.query<CashOut>(
      `UPDATE cash_outs SET amount = $1, note = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [amount, note.trim(), cashOutId]
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

// ─── Delete cash out ──────────────────────────────────────────────────────────

export async function deleteCashOut(
  cashOutId: string,
  cashierId: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const check = await client.query<{ cashier_id: string; shift_status: string }>(
      `SELECT co.cashier_id, s.status AS shift_status
       FROM cash_outs co JOIN shifts s ON s.id = co.shift_id
       WHERE co.id = $1 LIMIT 1`,
      [cashOutId]
    );
    if (!check.rowCount || check.rowCount === 0) throw new Error('Cash out not found.');
    if (check.rows[0].cashier_id !== cashierId)
      throw new Error('You do not have permission to delete this cash out.');
    if (check.rows[0].shift_status !== 'active')
      throw new Error('You cannot delete from a completed shift.');

    await client.query(`DELETE FROM cash_outs WHERE id = $1`, [cashOutId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Get cash outs for a shift ────────────────────────────────────────────────

export async function getShiftCashOuts(
  shiftId: string,
  cashierId?: string
): Promise<CashOut[]> {
  if (cashierId) {
    const shiftCheck = await pool.query<{ cashier_id: string }>(
      `SELECT cashier_id FROM shifts WHERE id = $1 LIMIT 1`, [shiftId]
    );
    if (!shiftCheck.rowCount || shiftCheck.rowCount === 0) throw new Error('Shift not found.');
    if (shiftCheck.rows[0].cashier_id !== cashierId)
      throw new Error('You do not have permission to view this shift.');
  }

  const result = await pool.query<CashOut>(
    `SELECT * FROM cash_outs WHERE shift_id = $1 ORDER BY created_at ASC`, [shiftId]
  );
  return result.rows;
}
