
import pool from "./db.js";

import fs from 'fs';

async function checkSchema() {
    try {
        const log = (msg) => {
            console.log(msg);
            fs.appendFileSync('schema_log.txt', msg + '\n');
        };

        log("Checking notifications table schema...");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications';
        `);
        log("Columns found: " + JSON.stringify(res.rows));

        const hasReadAt = res.rows.some(r => r.column_name === 'read_at');
        if (!hasReadAt) {
            log("❌ Missing 'read_at' column!");
            log("Attempting to add column...");
            await pool.query(`ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;`);
            log("✅ Added 'read_at' column.");
        } else {
            log("✅ 'read_at' column exists.");
        }

        const hasType = res.rows.some(r => r.column_name === 'type');
        if (!hasType) {
            log("❌ Missing 'type' column!");
            await pool.query(`ALTER TABLE notifications ADD COLUMN type VARCHAR(50);`);
            log("✅ Added 'type' column.");
        }

        log("Schema check complete.");

    } catch (e) {
        fs.appendFileSync('schema_log.txt', "Error checking schema: " + e.message + '\n');
        console.error("Error checking schema:", e);
    } finally {
        await pool.end();
    }
}

checkSchema();
