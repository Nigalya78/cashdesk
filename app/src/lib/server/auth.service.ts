import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './database';
import { User, JwtPayload, UserPublic } from './types';

export interface LoginResult {
  token: string;
  user: UserPublic;
  activeShiftId: string | null;
}

export async function registerUser(name: string, username: string, password: string): Promise<UserPublic> {
  // Check if username already taken
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE username = $1 LIMIT 1`,
    [username.toLowerCase().trim()]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error('Username is already taken.');
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await pool.query<User>(
    `INSERT INTO users (name, username, password_hash, role, status)
     VALUES ($1, $2, $3, 'cashier', 'active')
     RETURNING *`,
    [name.trim(), username.toLowerCase().trim(), hash]
  );

  const user = result.rows[0];
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  // 1. Find user by username
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE username = $1 AND status = 'active' LIMIT 1`,
    [username.toLowerCase().trim()]
  );

  if (result.rowCount === 0) {
    throw new Error('Invalid username or password.');
  }

  const user = result.rows[0];

  // 2. Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid username or password.');
  }

  // 3. Sign JWT
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Server configuration error.');

  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  const token = jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

  // 4. Check for existing active shift (cashiers only)
  let activeShiftId: string | null = null;
  if (user.role === 'cashier') {
    const shiftResult = await pool.query<{ id: string }>(
      `SELECT id FROM shifts WHERE cashier_id = $1 AND status = 'active' LIMIT 1`,
      [user.id]
    );
    if (shiftResult.rowCount && shiftResult.rowCount > 0) {
      activeShiftId = shiftResult.rows[0].id;
    }
  }

  const userPublic: UserPublic = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  return { token, user: userPublic, activeShiftId };
}

export async function getUserById(userId: string): Promise<UserPublic | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE id = $1 AND status = 'active' LIMIT 1`,
    [userId]
  );
  if (!result.rowCount || result.rowCount === 0) return null;
  const user = result.rows[0];
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
