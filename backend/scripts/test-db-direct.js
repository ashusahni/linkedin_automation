import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("🔍 Environment Variables Check:");
console.log(`   DB_HOST: ${process.env.DB_HOST}`);
console.log(`   DB_PORT: ${process.env.DB_PORT}`);
console.log(`   DB_USER: ${process.env.DB_USER}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD}`);
console.log(`   DB_NAME: ${process.env.DB_NAME}\n`);

// Create pool AFTER env vars are loaded
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function testConnection() {
    try {
        console.log("🔍 Testing Database Connection...\n");

        const client = await pool.connect();
        console.log("✅ Database connected successfully!\n");

        // Get database info
        const dbInfo = await client.query("SELECT current_database(), current_user, version()");
        console.log("📊 Database Info:");
        console.log(`   Database: ${dbInfo.rows[0].current_database}`);
        console.log(`   User: ${dbInfo.rows[0].current_user}`);
        console.log(`   Version: ${dbInfo.rows[0].version.split(',')[0]}\n`);

        // Count leads
        const countResult = await client.query("SELECT COUNT(*) FROM leads");
        const totalLeads = parseInt(countResult.rows[0].count);
        console.log(`📊 Total Leads: ${totalLeads}\n`);

        if (totalLeads > 0) {
            // Status breakdown
            const statusResult = await client.query(`
                SELECT status, COUNT(*) as count 
                FROM leads 
                GROUP BY status 
                ORDER BY count DESC
            `);

            console.log("📈 Status Breakdown:");
            statusResult.rows.forEach(row => {
                console.log(`   ${row.status}: ${row.count}`);
            });
            console.log();

            // Sample leads
            const sampleResult = await client.query(`
                SELECT id, full_name, company, title, status 
                FROM leads 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            console.log("📝 Sample Leads (Latest 5):");
            sampleResult.rows.forEach((lead, index) => {
                console.log(`\n   ${index + 1}. ${lead.full_name}`);
                console.log(`      Company: ${lead.company || 'N/A'}`);
                console.log(`      Title: ${lead.title || 'N/A'}`);
                console.log(`      Status: ${lead.status}`);
            });
        }

        client.release();
        await pool.end();
        console.log("\n✅ Database test complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Database Error:", error.message);
        console.error("Full error:", error);
        process.exit(1);
    }
}

testConnection();
