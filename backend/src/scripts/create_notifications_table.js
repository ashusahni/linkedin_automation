
import pool from '../db.js';

async function createNotificationsTable() {
    try {
        console.log('Creating notifications table...');
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
        console.log('✅ Notifications table created successfully');

        // Add index on read_at for faster unread count
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
        `);
        console.log('✅ Index created on read_at');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating notifications table:', err);
        process.exit(1);
    }
}

createNotificationsTable();
