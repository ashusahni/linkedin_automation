
import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend root
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env:', result.error);
} else {
    console.log('.env loaded from:', envPath);
}

const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'linkedin_outreach',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function check() {
    try {
        console.log('Checking database state...');

        // List all tables
        try {
            const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            console.log('Tables in public schema:', tables.rows.map(r => r.table_name).join(', '));
        } catch (e) {
            console.error('Error listing tables:', e);
        }

        // Check automation_logs
        try {
            const res = await pool.query("SELECT to_regclass('automation_logs') as exists");
            if (res.rows[0].exists) {
                console.log('✅ automation_logs table exists');

                // Check columns
                const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'automation_logs'");
                const colNames = cols.rows.map(r => r.column_name);
                console.log('   Columns:', colNames.join(', '));

                if (!colNames.includes('campaign_id')) console.log('   ⚠️ Missing campaign_id!');
            } else {
                console.log('❌ automation_logs table MISSING');
            }
        } catch (e) {
            console.log('❌ Error checking automation_logs:', e.message);
        }

        // Check approval_queue updated_at
        try {
            const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'approval_queue' AND column_name = 'updated_at'");
            if (res.rows.length > 0) {
                console.log('✅ approval_queue.updated_at exists');
            } else {
                console.log('❌ approval_queue.updated_at MISSING');
            }
        } catch (e) {
            console.log('❌ Error checking approval_queue:', e.message);
        }

    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await pool.end();
    }
}

check();
