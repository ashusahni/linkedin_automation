
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';
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

const pool = new Pool(config);

async function run() {
    try {
        const log = (msg) => {
            console.log(msg);
            fs.appendFileSync('db_fix_log.txt', msg + '\n');
        };

        log("Starting DB Fix...");
        log(`Connecting to ${config.host}:${config.port}/${config.database} as ${config.user}`);

        // Define table creation query
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                data JSONB DEFAULT '{}',
                read_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `;

        log("Executing CREATE TABLE...");
        await pool.query(createTableQuery);
        log("Table created or exists.");

        // Define indexes
        log("Creating indexes...");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at)");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)");
        log("Indexes created.");

        log("DB Fix Complete.");
        process.exit(0);
    } catch (e) {
        console.error("FATAL ERROR:", e);
        fs.appendFileSync('db_fix_log.txt', "ERROR: " + e.message + '\n');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
