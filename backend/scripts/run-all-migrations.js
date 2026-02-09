/**
 * Run all database migrations
 * This script will execute all pending migrations to create missing tables
 */

import dotenv from 'dotenv';
import { runMigrations } from '../src/db/migrations.js';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('🔄 Running all database migrations...\n');
    await runMigrations();
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
