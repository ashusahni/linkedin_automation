/**
 * Check if specific columns exist in the campaigns table
 */

import pkg from 'pg';
import dotenv from 'dotenv';
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

const REQUIRED_COLUMNS = [
  'schedule_start',
  'schedule_end',
  'daily_cap',
  'timezone',
  'tags',
  'priority',
  'description',
  'goal',
  'target_audience'
];

async function checkColumns() {
  try {
    console.log('🔍 Checking campaigns table columns...\n');
    
    const client = await pool.connect();
    console.log('✅ Database connected\n');

    for (const columnName of REQUIRED_COLUMNS) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'campaigns'
          AND column_name = $1
        );
      `, [columnName]);

      const exists = result.rows[0].exists;
      const status = exists ? '✅' : '❌';
      console.log(`${status} Column '${columnName}': ${exists ? 'EXISTS' : 'MISSING'}`);
    }

    client.release();
    await pool.end();
    
    console.log('\n✅ Verification complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
