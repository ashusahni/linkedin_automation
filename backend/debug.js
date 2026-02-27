import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

async function check() {
    const r1 = await pool.query("SELECT * FROM preference_settings LIMIT 1");
    console.log("preference_settings columns:", Object.keys(r1.rows[0] || {}));

    const r2 = await pool.query("SELECT * FROM leads LIMIT 1");
    console.log("leads columns:", Object.keys(r2.rows[0] || {}).join(", "));
    pool.end();
}
check();
