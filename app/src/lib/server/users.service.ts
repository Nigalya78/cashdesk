import bcrypt from 'bcryptjs';
import pool from './database';
import { User, UserPublic, UserStatus } from './types';

const SALT_ROUNDS = 12;

function toPublic(u: User): UserPublic {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

export async function getAllCashiers(): Promise<UserPublic[]> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE role = 'cashier' ORDER BY name ASC`
  );
  return result.rows.map(toPublic);
}

export async function getCashierById(id: string): Promise<UserPublic | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE id = $1 AND role = 'cashier' LIMIT 1`,
    [id]
  );
  if (!result.rowCount || result.rowCount === 0) return null;
  return toPublic(result.rows[0]);
}

export async function createCashier(
  name: string,
  username: string,
  password: string
): Promise<UserPublic> {
  // Check username uniqueness
  const existing = await pool.query(
    `SELECT id FROM users WHERE username = $1 LIMIT 1`,
    [username.toLowerCase().trim()]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error('Username already taken.');
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query<User>(
    `INSERT INTO users (name, username, password_hash, role)
     VALUES ($1, $2, $3, 'cashier')
     RETURNING *`,
    [name.trim(), username.toLowerCase().trim(), hash]
  );
  return toPublic(result.rows[0]);
}

export async function updateCashierStatus(
  id: string,
  status: UserStatus
): Promise<UserPublic | null> {
  const result = await pool.query<User>(
    `UPDATE users SET status = $1, updated_at = NOW()
     WHERE id = $2 AND role = 'cashier'
     RETURNING *`,
    [status, id]
  );
  if (!result.rowCount || result.rowCount === 0) return null;
  return toPublic(result.rows[0]);
}

export async function resetCashierPassword(
  id: string,
  newPassword: string
): Promise<void> {
  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const result = await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW()
     WHERE id = $2 AND role = 'cashier'`,
    [hash, id]
  );
  if (!result.rowCount || result.rowCount === 0) {
    throw new Error('Cashier not found.');
  }
}
