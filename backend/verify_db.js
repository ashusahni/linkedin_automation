import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

async function checkColumns() {
    try {
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='preference_settings' AND column_name='preference_tiers';
    `);
        console.log("preference_tiers in preference_settings:", res.rowCount > 0);

        const res2 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='leads' AND column_name='manual_tier';
    `);
        console.log("manual_tier in leads:", res2.rowCount > 0);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkColumns();
