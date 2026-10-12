import pool from './database';

const CASH_IN_RETURNS_SQL = `
CREATE TABLE IF NOT EXISTS cash_in_returns (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_out_id UUID          NOT NULL REFERENCES cash_outs(id) ON DELETE CASCADE,
  shift_id    UUID          NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
  cashier_id  UUID          NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note        VARCHAR(200)  NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cash_in_returns_cash_out_id ON cash_in_returns(cash_out_id);
CREATE INDEX IF NOT EXISTS idx_cash_in_returns_shift_id    ON cash_in_returns(shift_id);
`;

let migrated = false;
export async function ensureMigrations(): Promise<void> {
  if (migrated) return;
  await pool.query(CASH_IN_RETURNS_SQL);
  migrated = true;
}
