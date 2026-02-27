import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

async function applyFixes() {
    try {
        console.log("Connecting to Render DB...");

        // 1. Add preference_tiers to preference_settings
        console.log("Adding preference_tiers to preference_settings (if not exists)...");
        await pool.query(`
      ALTER TABLE preference_settings
      ADD COLUMN IF NOT EXISTS preference_tiers JSONB;
    `);

        // 2. Add manual_tier to leads
        console.log("Adding manual_tier to leads (if not exists)...");
        await pool.query(`
      ALTER TABLE leads
      ADD COLUMN IF NOT EXISTS manual_tier VARCHAR(20);
    `);

        // While we are at it, also ensure contacts_min_score exists since it was added recently
        console.log("Adding contacts_min_score to preference_settings (if not exists)...");
        await pool.query(`
      ALTER TABLE preference_settings
      ADD COLUMN IF NOT EXISTS contacts_min_score INTEGER DEFAULT 70;
    `);

        console.log("Database fixes applied successfully!");
    } catch (err) {
        console.error("Error applying database fixes:", err);
    } finally {
        await pool.end();
    }
}

applyFixes();
