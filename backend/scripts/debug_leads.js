import pool from "../src/db.js";
import "./src/env.js";

async function checkExisitingLeads() {
    try {
        console.log("🔍 Checking campaigns...");
        const campaigns = await pool.query("SELECT id, name FROM campaigns");
        console.table(campaigns.rows);

        console.log("\n🔍 Checking campaign_leads...");
        const leads = await pool.query("SELECT * FROM campaign_leads");
        console.table(leads.rows);

        if (leads.rows.length === 0) {
            console.log("❌ No leads found in campaign_leads table!");
        } else {
            console.log(`✅ Found ${leads.rows.length} rows.`);
        }
    } catch (e) {
        console.error(e);
    }
}

checkExisitingLeads();
