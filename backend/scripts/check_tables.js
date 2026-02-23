import pool from '../src/db.js';

async function checkTables() {
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log("Tables in DB:", res.rows.map(r => r.table_name));

        const campaigns = await pool.query("SELECT * FROM campaigns LIMIT 1");
        console.log("Campaigns query success, rows:", campaigns.rows.length);

    } catch (err) {
        console.error("Check failed:", err.message);
    } finally {
        await pool.end();
    }
}

checkTables();
