/**
 * Database Migration Script
 * Run: ts-node database/migrations/migrate.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const MIGRATION_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100)  NOT NULL,
  username      VARCHAR(50)   NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(10)   NOT NULL CHECK (role IN ('admin', 'cashier')),
  status        VARCHAR(10)   NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);

-- ─────────────────────────────────────────────────────────────────────────────
-- SHIFTS
-- opening_cash_in : the opening float (plain amount, entered once)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id       UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  shift_date       DATE          NOT NULL,
  login_time       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  end_time         TIMESTAMPTZ,
  status           VARCHAR(10)   NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  opening_cash_in  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (opening_cash_in >= 0),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier_id     ON shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_shifts_shift_date     ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_shifts_status         ON shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_cashier_status ON shifts(cashier_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shifts_one_active_per_cashier
  ON shifts(cashier_id) WHERE status = 'active';

-- Add opening_cash_in if table already exists (safe ALTER)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='shifts' AND column_name='opening_cash_in'
  ) THEN
    ALTER TABLE shifts ADD COLUMN opening_cash_in NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (opening_cash_in >= 0);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENTRIES  (formerly "transactions" — named denomination+card entries)
-- entry_name : cashier-supplied label, required
-- cash_in    : sum of denominations (calculated server-side)
-- cash_out   : removed — cash outs are now in their own table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id          UUID          NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  cashier_id        UUID          NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  entry_name        VARCHAR(100)  NOT NULL DEFAULT '',
  transaction_date  DATE          NOT NULL,
  cash_in           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash_in >= 0),
  cash_out          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cash_out >= 0),
  card_amount       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (card_amount >= 0),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_shift_id     ON transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_id   ON transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date         ON transactions(transaction_date);

-- Add entry_name if table already exists (safe ALTER)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='transactions' AND column_name='entry_name'
  ) THEN
    ALTER TABLE transactions ADD COLUMN entry_name VARCHAR(100) NOT NULL DEFAULT '';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRANSACTION DENOMINATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_denominations (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id  UUID          NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  denomination    INTEGER       NOT NULL CHECK (denomination IN (1, 2, 5, 10, 20, 50, 100, 200, 500)),
  quantity        INTEGER       NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  UNIQUE (transaction_id, denomination)
);
CREATE INDEX IF NOT EXISTS idx_denominations_transaction_id ON transaction_denominations(transaction_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- CASH OUTS  (multiple per shift, each with a note)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_outs (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id    UUID          NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  cashier_id  UUID          NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note        VARCHAR(200)  NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_outs_shift_id   ON cash_outs(shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_outs_cashier_id ON cash_outs(cashier_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running database migrations...');
    await client.query(MIGRATION_SQL);
    console.log('✅ Migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
