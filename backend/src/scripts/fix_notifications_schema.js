
import pool from '../../src/db.js';
import fs from 'fs';
import path from 'path';

// Fix for Windows path resolution in some envs
const logFile = path.resolve('schema_fix.log');

function log(msg) {
    console.log(msg);
    try {
        fs.appendFileSync(logFile, msg + '\n');
    } catch (e) {
        // ignore
    }
}

async function fix() {
    log("Starting schema fix...");
    try {
        // 1. Check if table exists
        const tableRes = await pool.query("SELECT to_regclass('public.notifications')");
        if (!tableRes.rows[0].to_regclass) {
            log("Table 'notifications' does not exist. Creating...");
            await pool.query(`
                CREATE TABLE notifications (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT,
                    data JSONB DEFAULT '{}',
                    read_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
             `);
            log("Table created.");
        } else {
            log("Table 'notifications' exists.");
        }

        // 2. Check columns
        const colsRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'notifications'
        `);
        const columns = colsRes.rows.map(r => r.column_name);
        log("Columns: " + columns.join(", "));

        if (!columns.includes('read_at')) {
            log("Adding missing column 'read_at'...");
            await pool.query("ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE");
        }

        if (!columns.includes('type')) {
            log("Adding missing column 'type'...");
            await pool.query("ALTER TABLE notifications ADD COLUMN type VARCHAR(50)");
        }

        // 3. Create Indexes
        await pool.query("CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at)");

        log("Schema fix completed successfully.");
        process.exit(0);
    } catch (e) {
        log("FATAL ERROR: " + e.message);
        console.error(e);
        process.exit(1);
    }
}

fix();
