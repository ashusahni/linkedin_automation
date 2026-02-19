
import pool from '../db.js';

export async function ensureNotificationsTable() {
    console.log("🔔 Ensuring notifications table exists...");
    try {
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

        // Ensure columns exist (in case table existed but was old)
        const cols = ['type', 'title', 'message', 'data', 'read_at'];
        for (const col of cols) {
            const check = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='notifications' AND column_name=$1
             `, [col]);
            if (check.rows.length === 0) {
                console.log(`Column ${col} missing, adding...`);
                let type = 'TEXT';
                if (col === 'read_at') type = 'TIMESTAMP WITH TIME ZONE';
                if (col === 'type') type = 'VARCHAR(50)';
                if (col === 'title') type = 'VARCHAR(255)';
                if (col === 'data') type = 'JSONB DEFAULT \'{}\'';
                await pool.query(`ALTER TABLE notifications ADD COLUMN ${col} ${type}`);
            }
        }

        // Indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at)`);

        console.log("✅ Notifications table matched schema.");
    } catch (e) {
        console.error("❌ Failed to ensure notifications table:", e);
    }
}
