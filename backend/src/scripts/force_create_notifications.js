
import pool from '../db.js';

async function run() {
    try {
        console.log("Creating notifications table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                data JSONB DEFAULT '{}',
                read_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log("Creating indexes...");
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);`);
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
