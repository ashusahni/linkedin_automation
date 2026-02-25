import pkg from 'pg';
const { Pool } = pkg;

const renderDbUrl = "postgresql://linkedin_user:PgqiG5wExKOKeCZfriulnieL2t6dzfeJ@dpg-d65h2rt6ubrc7394umkg-a.ohio-postgres.render.com/linkedin_reach_lx8i";
const pool = new Pool({
    connectionString: renderDbUrl,
    ssl: { rejectUnauthorized: false }
});

async function fixSchema() {
    const client = await pool.connect();
    try {
        console.log("🛠️ Fixing Render Database Schema...");

        // 1. Add missing profile_image_url to leads
        await client.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS profile_image VARCHAR(500); 
    `);
        console.log("✅ Added profile_image columns to leads");

        // 2. Add description to campaigns (common missing column)
        await client.query(`
      ALTER TABLE campaigns 
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);
        console.log("✅ Added description to campaigns");

        // 3. Add any other columns that might be in the code but not migration
        await client.query(`
      ALTER TABLE leads 
      ADD COLUMN IF NOT EXISTS connection_degree VARCHAR(50);
    `);
        console.log("✅ Added connection_degree to leads");

        console.log("✨ Render Schema Fixes Complete!");
    } catch (err) {
        console.error("❌ Error fixing schema:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fixSchema();
