
import pool from './src/db.js';

async function verifyTable() {
    try {
        console.log("Verifying notifications table...");

        // 1. Check if table exists
        const res = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'notifications'
            );
        `);
        console.log("Table exists:", res.rows[0].exists);

        if (!res.rows[0].exists) {
            console.log("FATAL: Table 'notifications' does NOT exist!");
            process.exit(1);
        }

        // 2. Check read_at column
        const colRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications';
        `);
        console.log("Columns:", colRes.rows.map(r => r.column_name));

        const hasReadAt = colRes.rows.some(r => r.column_name === 'read_at');
        if (!hasReadAt) {
            console.log("FATAL: Missing 'read_at' column!");
            process.exit(1);
        }

        // 3. Try to insert
        const insertRes = await pool.query(`
             INSERT INTO notifications (type, title, message, data, read_at) 
             VALUES ('test', 'Test Title', 'Test Message', '{}', NULL) 
             RETURNING id
        `);
        console.log("Insert successful. ID:", insertRes.rows[0].id);

        // 4. Clean up
        await pool.query('DELETE FROM notifications WHERE id = $1', [insertRes.rows[0].id]);
        console.log("Cleanup successful.");

        console.log("✅ VERIFICATION PASSED");
        process.exit(0);

    } catch (e) {
        console.error("❌ VERIFICATION FAILED:", e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

verifyTable();
