/**
 * Fix missing database tables by directly executing SQL files
 * This bypasses the migration system to ensure tables are created
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'linkedin_leads'
});

// Required migration files in order
const MIGRATION_FILES = [
  '001_create_campaigns.sql',
  '005_create_import_logs.sql'
];

async function createTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating missing database tables...\n');
    
    // First, create the schema_migrations table if it doesn't exist
    console.log('Creating schema_migrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ schema_migrations table ready\n');

    const migrationsDir = path.resolve(__dirname, '../database/migrations');
    
    for (const filename of MIGRATION_FILES) {
      const filePath = path.join(migrationsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Migration file not found: ${filename}`);
        continue;
      }

      // Extract migration number from filename
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
        // Execute the SQL (DDL statements don't need transactions)
        await client.query(sql);
        
        // Mark as run
        await client.query(
          'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
          [migrationNumber, filename]
        );
        
        console.log(`✅ ${filename} completed\n`);
      } catch (error) {
        // If table already exists, that's okay
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️  ${filename}: Some objects already exist (continuing...)\n`);
          // Still mark as run
          await client.query(
            'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
            [migrationNumber, filename]
          );
        } else {
          console.error(`❌ ${filename} failed:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ All tables created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
