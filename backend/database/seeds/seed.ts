/**
 * Database Seed Script
 * Run: ts-node database/seeds/seed.ts
 *
 * Creates one admin user and three sample cashiers.
 * Passwords are hashed with bcrypt.
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Neon
});

const SALT_ROUNDS = 12;

const users = [
  { name: 'Admin',  username: 'admin',  password: 'Admin@1234',  role: 'admin'    },
  { name: 'Kumar',  username: 'kumar',  password: 'Kumar@1234',  role: 'cashier'  },
  { name: 'Ravi',   username: 'ravi',   password: 'Ravi@1234',   role: 'cashier'  },
  { name: 'Arun',   username: 'arun',   password: 'Arun@1234',   role: 'cashier'  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
      await client.query(
        `INSERT INTO users (name, username, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) DO NOTHING`,
        [u.name, u.username, hash, u.role]
      );
      console.log(`  ✓ User seeded: ${u.username} (${u.role})`);
    }

    console.log('✅ Seeding completed.');
    console.log('');
    console.log('Default credentials:');
    console.log('  Admin   → username: admin  | password: Admin@1234');
    console.log('  Kumar   → username: kumar  | password: Kumar@1234');
    console.log('  Ravi    → username: ravi   | password: Ravi@1234');
    console.log('  Arun    → username: arun   | password: Arun@1234');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
