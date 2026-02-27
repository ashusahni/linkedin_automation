import pool from './backend/src/db.js';

async function migrate() {
    try {
        console.log("Adding manual_tier to leads...");
        await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS manual_tier VARCHAR(50);");

        console.log("Adding contacts_min_score to preference_settings...");
        // If not exists we can just add it:
        await pool.query("ALTER TABLE preference_settings ADD COLUMN IF NOT EXISTS contacts_min_score INTEGER DEFAULT 70;");

        console.log("Migration successful");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit(0);
    }
}

migrate();
