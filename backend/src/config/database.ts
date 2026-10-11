import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Neon (and other managed Postgres providers) use a single connection string.
// The pg driver accepts it directly via the `connectionString` option.
// SSL is required for Neon — we set rejectUnauthorized: false only for
// development ease; in production set it to true and supply a CA cert.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }, // Neon requires SSL — verify-full
  max: 10,                  // Neon free tier has connection limits — keep this low
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export default pool;
