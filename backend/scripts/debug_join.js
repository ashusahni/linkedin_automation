import pool from "../src/db.js";
import "./src/env.js";

async function testJoinQuery() {
    try {
        console.log("🔍 Testing JOIN query for Campaign ID 4 (Test Auto)...");

        const text = `
            SELECT cl.*, l.first_name, l.last_name 
            FROM campaign_leads cl
            JOIN leads l ON cl.lead_id = l.id
            WHERE cl.campaign_id = $1
        `;

        const res = await pool.query(text, [4]);

        console.log(`Query returned ${res.rows.length} rows.`);
        if (res.rows.length > 0) {
            console.table(res.rows.slice(0, 5));
        } else {
            console.log("❌ JOIN failed. Checking orphan records...");
            // Check if leads exist
            const leadIds = await pool.query("SELECT lead_id FROM campaign_leads WHERE campaign_id = 4 LIMIT 5");
            console.log("Lead IDs in campaign_leads:", leadIds.rows);

            if (leadIds.rows.length > 0) {
                const checkLeads = await pool.query("SELECT id, first_name FROM leads WHERE id = ANY($1::int[])", [leadIds.rows.map(r => r.lead_id)]);
                console.log("Matching entries in 'leads' table:", checkLeads.rows);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

testJoinQuery();
