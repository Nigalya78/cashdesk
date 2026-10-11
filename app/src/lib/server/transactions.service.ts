import pool from './database';
import {
  Transaction, TransactionWithDenominations,
  TransactionDenomination, DenominationValue, VALID_DENOMINATIONS,
} from './types';
import { todayDateString } from './dateUtils';

export interface DenominationInput {
  denomination: DenominationValue;
  quantity: number;
}

export interface CreateEntryInput {
  shift_id: string;
  cashier_id: string;
  entry_name: string;
  denominations: DenominationInput[];
  card_amount: number;
}

export interface UpdateEntryInput {
  entry_name: string;
  denominations: DenominationInput[];
  card_amount: number;
}

function computeCashIn(denominations: DenominationInput[]): number {
  return denominations.reduce((sum, d) => sum + d.denomination * d.quantity, 0);
}

async function fetchWithDenominations(txId: string): Promise<TransactionWithDenominations> {
  const txResult = await pool.query<Transaction>(
    `SELECT * FROM transactions WHERE id = $1`, [txId]
  );
  const denResult = await pool.query<TransactionDenomination>(
    `SELECT * FROM transaction_denominations WHERE transaction_id = $1 ORDER BY denomination DESC`,
    [txId]
  );
  return { ...txResult.rows[0], denominations: denResult.rows };
}

// ─── Create named entry ───────────────────────────────────────────────────────

export async function createEntry(
  input: CreateEntryInput
): Promise<TransactionWithDenominations> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const shiftCheck = await client.query<{ status: string; cashier_id: string }>(
      `SELECT status, cashier_id FROM shifts WHERE id = $1 LIMIT 1`,
      [input.shift_id]
    );
    if (!shiftCheck.rowCount || shiftCheck.rowCount === 0) throw new Error('Shift not found.');
    if (shiftCheck.rows[0].cashier_id !== input.cashier_id)
      throw new Error('You do not have permission to add entries to this shift.');
    if (shiftCheck.rows[0].status !== 'active')
      throw new Error('This shift has already been completed.');

    const validDenoms = input.denominations.filter(
      (d) => VALID_DENOMINATIONS.includes(d.denomination) && d.quantity > 0
    );
    const cashIn = computeCashIn(validDenoms);

    const txResult = await client.query<Transaction>(
      `INSERT INTO transactions
         (shift_id, cashier_id, entry_name, transaction_date, cash_in, cash_out, card_amount)
       VALUES ($1, $2, $3, $4, $5, 0, $6)
       RETURNING *`,
      [input.shift_id, input.cashier_id, input.entry_name.trim(), todayDateString(), cashIn, input.card_amount]
    );
    const tx = txResult.rows[0];

    for (const d of validDenoms) {
      await client.query(
        `INSERT INTO transaction_denominations (transaction_id, denomination, quantity, amount)
         VALUES ($1, $2, $3, $4)`,
        [tx.id, d.denomination, d.quantity, d.denomination * d.quantity]
      );
    }

    await client.query('COMMIT');
    return fetchWithDenominations(tx.id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Update named entry ───────────────────────────────────────────────────────

export async function updateEntry(
  transactionId: string,
  cashierId: string,
  input: UpdateEntryInput
): Promise<TransactionWithDenominations> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txCheck = await client.query<Transaction & { shift_status: string }>(
      `SELECT t.*, s.status AS shift_status
       FROM transactions t JOIN shifts s ON s.id = t.shift_id
       WHERE t.id = $1 LIMIT 1`,
      [transactionId]
    );
    if (!txCheck.rowCount || txCheck.rowCount === 0) throw new Error('Entry not found.');
    const existing = txCheck.rows[0];
    if (existing.cashier_id !== cashierId)
      throw new Error('You do not have permission to edit this entry.');
    if (existing.shift_status !== 'active')
      throw new Error('You cannot edit a completed shift.');

    const validDenoms = input.denominations.filter(
      (d) => VALID_DENOMINATIONS.includes(d.denomination) && d.quantity >= 0
    );
    const cashIn = computeCashIn(validDenoms.filter((d) => d.quantity > 0));

    await client.query(
      `UPDATE transactions SET entry_name = $1, cash_in = $2, card_amount = $3, updated_at = NOW()
       WHERE id = $4`,
      [input.entry_name.trim(), cashIn, input.card_amount, transactionId]
    );

    await client.query(`DELETE FROM transaction_denominations WHERE transaction_id = $1`, [transactionId]);

    for (const d of validDenoms.filter((d) => d.quantity > 0)) {
      await client.query(
        `INSERT INTO transaction_denominations (transaction_id, denomination, quantity, amount)
         VALUES ($1, $2, $3, $4)`,
        [transactionId, d.denomination, d.quantity, d.denomination * d.quantity]
      );
    }

    await client.query('COMMIT');
    return fetchWithDenominations(transactionId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Delete named entry ───────────────────────────────────────────────────────

export async function deleteEntry(
  transactionId: string,
  cashierId: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const txCheck = await client.query<{ cashier_id: string; shift_status: string }>(
      `SELECT t.cashier_id, s.status AS shift_status
       FROM transactions t JOIN shifts s ON s.id = t.shift_id
       WHERE t.id = $1 LIMIT 1`,
      [transactionId]
    );
    if (!txCheck.rowCount || txCheck.rowCount === 0) throw new Error('Entry not found.');
    if (txCheck.rows[0].cashier_id !== cashierId)
      throw new Error('You do not have permission to delete this entry.');
    if (txCheck.rows[0].shift_status !== 'active')
      throw new Error('You cannot delete entries from a completed shift.');

    // Denominations cascade-delete via FK
    await client.query(`DELETE FROM transactions WHERE id = $1`, [transactionId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Get shift entries ────────────────────────────────────────────────────────

export async function getShiftEntries(
  shiftId: string,
  cashierId?: string
): Promise<TransactionWithDenominations[]> {
  if (cashierId) {
    const shiftCheck = await pool.query<{ cashier_id: string }>(
      `SELECT cashier_id FROM shifts WHERE id = $1 LIMIT 1`, [shiftId]
    );
    if (!shiftCheck.rowCount || shiftCheck.rowCount === 0) throw new Error('Shift not found.');
    if (shiftCheck.rows[0].cashier_id !== cashierId)
      throw new Error('You do not have permission to view this shift.');
  }

  const txResult = await pool.query<Transaction>(
    `SELECT * FROM transactions WHERE shift_id = $1 ORDER BY created_at ASC`, [shiftId]
  );

  const entries: TransactionWithDenominations[] = [];
  for (const tx of txResult.rows) {
    const denResult = await pool.query<TransactionDenomination>(
      `SELECT * FROM transaction_denominations WHERE transaction_id = $1 ORDER BY denomination DESC`,
      [tx.id]
    );
    entries.push({ ...tx, denominations: denResult.rows });
  }
  return entries;
}

export async function getCashierEntries(
  cashierId: string, fromDate?: string, toDate?: string
): Promise<TransactionWithDenominations[]> {
  const params: (string | undefined)[] = [cashierId];
  let where = `WHERE t.cashier_id = $1`;
  if (fromDate) { params.push(fromDate); where += ` AND t.transaction_date >= $${params.length}`; }
  if (toDate)   { params.push(toDate);   where += ` AND t.transaction_date <= $${params.length}`; }

  const txResult = await pool.query<Transaction>(
    `SELECT t.* FROM transactions t ${where} ORDER BY t.transaction_date DESC, t.created_at DESC`,
    params
  );
  const entries: TransactionWithDenominations[] = [];
  for (const tx of txResult.rows) {
    const denResult = await pool.query<TransactionDenomination>(
      `SELECT * FROM transaction_denominations WHERE transaction_id = $1 ORDER BY denomination DESC`,
      [tx.id]
    );
    entries.push({ ...tx, denominations: denResult.rows });
  }
  return entries;
}
