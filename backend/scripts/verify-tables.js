/**
 * Verify that required database tables exist
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

const REQUIRED_TABLES = [
  'leads',
  'campaigns',
  'import_logs',
  'sequences',
  'campaign_leads',
  'schema_migrations'
];

async function verifyTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    const client = await pool.connect();
    console.log('✅ Database connected\n');

    for (const tableName of REQUIRED_TABLES) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      const exists = result.rows[0].exists;
      const status = exists ? '✅' : '❌';
      console.log(`${status} Table '${tableName}': ${exists ? 'EXISTS' : 'MISSING'}`);
    }

    // Check migration status
    console.log('\n📊 Migration Status:');
    try {
      const migrations = await client.query(`
        SELECT version, filename, run_at 
        FROM schema_migrations 
        ORDER BY version
      `);
      
      if (migrations.rows.length === 0) {
        console.log('⚠️  No migrations recorded');
      } else {
        console.log(`Found ${migrations.rows.length} migration(s) recorded:`);
        migrations.rows.forEach(m => {
          console.log(`  - ${m.version}: ${m.filename} (${m.run_at})`);
        });
      }
    } catch (err) {
      console.log('⚠️  Could not check migration status:', err.message);
    }

    client.release();
    await pool.end();
    
    console.log('\n✅ Verification complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTables();
