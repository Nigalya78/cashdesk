import { Pool } from 'pg';

// Singleton pattern: reuse the pool across hot-reloads in dev and across
// invocations in the same serverless container in production.
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL client error', err);
  });
  return pool;
}

const pool: Pool = global._pgPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}

export default pool;
