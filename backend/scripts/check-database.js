import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Debug: Check if env vars are loaded
console.log("🔍 Environment Variables Check:");
console.log(`   DB_HOST: ${process.env.DB_HOST}`);
console.log(`   DB_PORT: ${process.env.DB_PORT}`);
console.log(`   DB_USER: ${process.env.DB_USER}`);
console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME}\n`);

import pool from "../src/db.js";

async function checkDatabase() {
    try {
        console.log("🔍 Checking Database Connection...\n");

        // Test connection
        const client = await pool.connect();
        console.log("✅ Database connected successfully!\n");

        // Check database info
        const dbInfo = await client.query("SELECT current_database(), current_user");
        console.log("📊 Database Info:");
        console.log(`   Database: ${dbInfo.rows[0].current_database}`);
        console.log(`   User: ${dbInfo.rows[0].current_user}\n`);

        // Check if leads table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'leads'
            );
        `);

        if (!tableCheck.rows[0].exists) {
            console.log("⚠️ 'leads' table does not exist yet!\n");
            client.release();
            return;
        }

        console.log("✅ 'leads' table exists\n");

        // Count total leads
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
                SELECT id, full_name, company, title, status, created_at 
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
                console.log(`      Created: ${lead.created_at}`);
            });
        } else {
            console.log("⚠️ No leads in database yet. Import some data first!");
        }

        client.release();
        console.log("\n✅ Database check complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Database Error:", error.message);
        process.exit(1);
    }
}

checkDatabase();
