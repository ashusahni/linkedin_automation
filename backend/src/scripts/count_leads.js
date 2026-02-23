import pool from '../db.js';

async function run() {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM leads');
        console.log(`Current leads count: ${result.rows[0].count}`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
