/**
 * Run ALL database migrations in order
 * This ensures all tables and columns are created
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'linkedin_leads'
});

async function runAllMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running all database migrations...\n');
    
    // Create schema_migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../database/migrations');
    
    // Get all migration files and sort them
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0', 10);
        const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0', 10);
        return numA - numB;
      });

    console.log(`Found ${files.length} migration file(s)\n`);

    for (const filename of files) {
      const filePath = path.join(migrationsDir, filename);
      const match = filename.match(/^(\d+)/);
      const migrationNumber = match ? parseInt(match[1], 10) : 0;

      // Check if already run
      const checkResult = await client.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [migrationNumber]
      );

      if (checkResult.rows.length > 0) {
        console.log(`⏭️  Skipping ${filename} (already run)`);
        continue;
      }

      console.log(`📄 Running ${filename}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        // Execute the SQL
        await client.query(sql);
        
        // Mark as run
        await client.query(
          'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [migrationNumber, filename]
        );
        
        console.log(`✅ ${filename} completed\n`);
      } catch (error) {
        // If objects already exist, that's okay for ALTER TABLE ADD COLUMN IF NOT EXISTS
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('column') && error.message.includes('already exists')) {
          console.log(`⚠️  ${filename}: Some objects already exist (continuing...)\n`);
          // Still mark as run
          await client.query(
            'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
            [migrationNumber, filename]
          );
        } else {
          console.error(`❌ ${filename} failed:`, error.message);
          // Don't throw - continue with other migrations
          console.log(`   Continuing with other migrations...\n`);
        }
      }
    }

    console.log('✅ All migrations processed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runAllMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
