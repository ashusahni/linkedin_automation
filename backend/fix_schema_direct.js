
import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';

dotenv.config();

const { Pool } = pg;

const config = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log("Using config:", { ...config, password: '***' });

const pool = new Pool(config);

async function run() {
    console.log("Connecting...");
    try {
        await pool.query('SELECT NOW()');
        console.log("Connected!");

        // Ensure table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log("Table check OK");

        // Ensure columns exist (Postgres syntax)
        const cols = ['type', 'title', 'message', 'read_at'];
        for (const col of cols) {
            try {
                // Check if column exists
                const res = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='notifications' AND column_name=$1
                `, [col]);

                if (res.rows.length === 0) {
                    console.log(`Adding missing column: ${col}`);
                    let type = 'TEXT';
                    if (col === 'read_at') type = 'TIMESTAMP WITH TIME ZONE';
                    if (col === 'type') type = 'VARCHAR(50)';
                    if (col === 'title') type = 'VARCHAR(255)';

                    await pool.query(`ALTER TABLE notifications ADD COLUMN ${col} ${type}`);
                    console.log(`Added column ${col}`);
                } else {
                    console.log(`Column ${col} exists`);
                }
            } catch (colErr) {
                console.error(`Error checking column ${col}:`, colErr.message);
            }
        }

        // Ensure data column exists
        const dataRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='notifications' AND column_name='data'`);
        if (dataRes.rows.length === 0) {
            console.log("Adding data column");
            await pool.query(`ALTER TABLE notifications ADD COLUMN data JSONB DEFAULT '{}'`);
        } else {
            console.log("Column data exists");
        }

        console.log("Schema fix complete.");
        process.exit(0);
    } catch (e) {
        console.error("FATAL ERROR:", e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
