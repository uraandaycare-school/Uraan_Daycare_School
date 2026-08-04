'use strict';

const { Pool } = require('pg');

// Neon PostgreSQL connection via DATABASE_URL env var
// Works both locally (with Neon connection string in .env) and on Vercel (auto-injected)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,                  // max connections in pool (keep low for Neon free tier)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] ❌ Failed to connect to Neon PostgreSQL:', err.message);
    return;
  }
  console.log('[DB] ✅ Connected to Neon PostgreSQL successfully');
  release();
});

module.exports = pool;
