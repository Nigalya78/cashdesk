import pool from './database';
import { CashInReturn } from './types';
import { ensureMigrations } from './migrate';

export async function addCashInReturn(
  cashOutId: string,
  shiftId: string,
  cashierId: string,
  amount: number,
  note: string
): Promise<CashInReturn> {
  await ensureMigrations();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // verify cash_out belongs to shift and cashier
    const check = await client.query<{ shift_id: string; cashier_id: string; shift_status: string }>(
      `SELECT co.shift_id, co.cashier_id, s.status AS shift_status
       FROM cash_outs co
       JOIN shifts s ON s.id = co.shift_id
       WHERE co.id = $1 LIMIT 1`,
      [cashOutId]
    );
    if (!check.rowCount || check.rowCount === 0) throw new Error('Cash out not found.');
    if (check.rows[0].shift_id !== shiftId) throw new Error('Cash out does not belong to this shift.');
    if (check.rows[0].cashier_id !== cashierId) throw new Error('You do not have permission to add returns to this cash out.');
    if (check.rows[0].shift_status !== 'active') throw new Error('This shift has already been completed.');
    const result = await client.query<CashInReturn>(
      `INSERT INTO cash_in_returns (cash_out_id, shift_id, cashier_id, amount, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [cashOutId, shiftId, cashierId, amount, note.trim()]
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

export async function deleteCashInReturn(
  id: string,
  cashierId: string
): Promise<void> {
  await ensureMigrations();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query<{ cashier_id: string; shift_status: string }>(
      `SELECT cir.cashier_id, s.status AS shift_status
       FROM cash_in_returns cir
       JOIN shifts s ON s.id = cir.shift_id
       WHERE cir.id = $1 LIMIT 1`,
      [id]
    );
    if (!check.rowCount || check.rowCount === 0) throw new Error('Cash in return not found.');
    if (check.rows[0].cashier_id !== cashierId) throw new Error('You do not have permission to delete this return.');
    if (check.rows[0].shift_status !== 'active') throw new Error('Cannot delete from a completed shift.');
    await client.query(`DELETE FROM cash_in_returns WHERE id = $1`, [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getCashInReturnsForShift(
  shiftId: string,
  cashierId: string
): Promise<CashInReturn[]> {
  await ensureMigrations();
  const result = await pool.query<CashInReturn>(
    `SELECT cir.* FROM cash_in_returns cir
     JOIN shifts s ON s.id = cir.shift_id
     WHERE cir.shift_id = $1 AND cir.cashier_id = $2
     ORDER BY cir.created_at ASC`,
    [shiftId, cashierId]
  );
  return result.rows;
}
