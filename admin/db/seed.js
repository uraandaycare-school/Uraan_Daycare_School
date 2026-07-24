'use strict';

/**
 * seed.js — Run this ONCE to:
 *   1. Create all database tables (schema.sql)
 *   2. Create the default admin user
 *
 * Usage:  node admin/db/seed.js
 *
 * Requires DATABASE_URL in .env (your Neon connection string)
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');

// ── Default credentials — CHANGE PASSWORD after first login ──
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'Uraan@2026';

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔗 Connecting to Neon PostgreSQL...');
    const client = await pool.connect();
    console.log('✅ Connected!\n');

    // 1. Run schema
    console.log('📦 Creating tables from schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql  = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);
    console.log('✅ Tables created (or already exist)\n');

    // 2. Create default admin user (skip if already exists)
    console.log(`👤 Creating admin user: "${DEFAULT_USERNAME}"...`);
    const existing = await client.query(
      'SELECT id FROM admin_users WHERE username = $1',
      [DEFAULT_USERNAME]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  Admin user already exists — skipping creation.');
      console.log('   To reset, run: DELETE FROM admin_users WHERE username = \'admin\';');
    } else {
      const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
      await client.query(
        'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
        [DEFAULT_USERNAME, hash]
      );
      console.log('✅ Admin user created!');
      console.log(`   Username : ${DEFAULT_USERNAME}`);
      console.log(`   Password : ${DEFAULT_PASSWORD}`);
      console.log('   ⚠️  Please change this password after first login!\n');
    }

    client.release();
    console.log('🎉 Seed complete! You can now start the server with: npm start');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error('   Code   :', err.code);
    console.error('   Detail :', err.detail || '(none)');
    console.error('   Hint   :', err.hint   || '(none)');
    console.error('   Stack  :', err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
