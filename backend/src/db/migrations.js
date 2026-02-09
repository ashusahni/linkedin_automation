/**
 * Database Migration Runner
 * 
 * Automatically runs pending migrations in order.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../../database/migrations');
const SCHEMA_FILE = path.resolve(__dirname, '../../database/schema.sql');
const ACTIVITIES_FILE = path.resolve(__dirname, '../../database/create_lead_activities_table.sql');

/**
 * Get all migration files sorted by number
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    logger.warn('Migrations directory not found:', MIGRATIONS_DIR);
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort((a, b) => {
      // Extract number from filename (e.g., "001_create_campaigns.sql" -> 1)
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  return files.map(file => ({
    filename: file,
    path: path.join(MIGRATIONS_DIR, file),
    number: parseInt(file.match(/^(\d+)/)?.[1] || '0', 10)
  }));
}

/**
 * Check if migration has been run
 */
async function isMigrationRun(migrationNumber) {
  try {
    // Check if migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'schema_migrations'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Create migrations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      return false;
    }

    // Check if this migration has been run
    const result = await pool.query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [migrationNumber]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Mark migration as run
 */
async function markMigrationRun(migrationNumber, filename) {
  try {
    await pool.query(
      'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
      [migrationNumber, filename]
    );
  } catch (error) {
    logger.error('Error marking migration as run:', error);
    throw error;
  }
}

/**
 * Run a single migration file
 */
async function runMigration(migration) {
  try {
    logger.info(`Running migration: ${migration.filename}`);
    const sql = fs.readFileSync(migration.path, 'utf8');

    // Run migration in a transaction
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await markMigrationRun(migration.number, migration.filename);
      await pool.query('COMMIT');
      logger.success(`Migration ${migration.filename} completed`);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`Migration ${migration.filename} failed:`, error.message);
    throw error;
  }
}

/**
 * Run base schema
 */
async function runBaseSchema() {
  if (!fs.existsSync(SCHEMA_FILE)) {
    logger.warn('Base schema file not found:', SCHEMA_FILE);
    return;
  }

  try {
    logger.info('Running base schema: schema.sql');
    const sql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    await pool.query(sql);
    logger.success('Base schema applied');
  } catch (error) {
    // Ignore errors if tables already exist
    if (!error.message.includes('already exists')) {
      logger.error('Base schema error:', error.message);
      throw error;
    }
    logger.info('Base schema already applied');
  }
}

/**
 * Run lead activities schema
 */
async function runActivitiesSchema() {
  if (!fs.existsSync(ACTIVITIES_FILE)) {
    logger.warn('Activities schema file not found:', ACTIVITIES_FILE);
    return;
  }

  try {
    logger.info('Running lead activities schema');
    const sql = fs.readFileSync(ACTIVITIES_FILE, 'utf8');
    await pool.query(sql);
    logger.success('Lead activities schema applied');
  } catch (error) {
    if (!error.message.includes('already exists')) {
      logger.error('Activities schema error:', error.message);
      throw error;
    }
    logger.info('Activities schema already applied');
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations() {
  try {
    logger.info('🔄 Starting database migrations...');

    // Run base schema first
    await runBaseSchema();

    // Run activities schema
    await runActivitiesSchema();

    // Get all migrations
    const migrations = getMigrationFiles();

    if (migrations.length === 0) {
      logger.info('No migrations found');
      return;
    }

    logger.info(`Found ${migrations.length} migration(s)`);

    // Run each pending migration
    for (const migration of migrations) {
      const isRun = await isMigrationRun(migration.number);

      if (isRun) {
        logger.info(`⏭️  Skipping ${migration.filename} (already run)`);
        continue;
      }

      await runMigration(migration);
    }

    logger.success('✅ All migrations completed');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus() {
  const migrations = getMigrationFiles();
  const status = [];

  for (const migration of migrations) {
    const isRun = await isMigrationRun(migration.number);
    status.push({
      version: migration.number,
      filename: migration.filename,
      run: isRun
    });
  }

  return status;
}
