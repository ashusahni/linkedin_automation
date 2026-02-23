/**
 * One-shot migration runner for 025_add_preference_scoring.sql
 * Run with:  node scripts/run_025_migration.mjs
 */
import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_NAME || 'linkedin_leads',
});

const SQL = fs.readFileSync(
    path.join(__dirname, '..', 'database', 'migrations', '025_add_preference_scoring.sql'),
    'utf8'
);

try {
    console.log('Running migration 025…');
    await pool.query(SQL);
    console.log('✅  Migration 025 applied successfully.');

    // Mark in schema_migrations so the auto-runner doesn't try to re-run it
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
    await pool.query(
        `INSERT INTO schema_migrations (version, filename) VALUES (25, '025_add_preference_scoring.sql')
     ON CONFLICT (version) DO NOTHING`
    );
    console.log('✅  Recorded in schema_migrations.');
} catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
} finally {
    await pool.end();
}
