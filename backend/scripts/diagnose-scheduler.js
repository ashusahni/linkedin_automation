import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import pool from "../src/db.js";

async function diagnoseScheduler() {
    try {
        console.log("🔍 Diagnosing Scheduler Issues...\n");

        // 1. Find leads that are stuck (have pending/ready_for_action but no matching sequence)
        console.log("1️⃣ Checking for leads without matching sequence steps...\n");
        
        const stuckLeads = await pool.query(`
            SELECT 
                cl.campaign_id,
                cl.lead_id,
                cl.current_step,
                cl.status,
                cl.next_action_due,
                l.full_name,
                l.linkedin_url,
                c.name as campaign_name,
                s.id as sequence_id,
                s.step_order,
                s.type as sequence_type
            FROM campaign_leads cl
            JOIN leads l ON cl.lead_id = l.id
            LEFT JOIN campaigns c ON cl.campaign_id = c.id
            LEFT JOIN sequences s ON cl.campaign_id = s.campaign_id AND cl.current_step = s.step_order
            WHERE cl.status IN ('pending', 'ready_for_action')
            AND (cl.next_action_due <= NOW() OR cl.next_action_due IS NULL)
            AND s.id IS NULL
        `);

        if (stuckLeads.rows.length > 0) {
            console.log(`⚠️ Found ${stuckLeads.rows.length} stuck lead(s):\n`);
            stuckLeads.rows.forEach((lead, idx) => {
                console.log(`   ${idx + 1}. Lead ID: ${lead.lead_id} (${lead.full_name})`);
                console.log(`      Campaign: ${lead.campaign_name || `ID ${lead.campaign_id}`}`);
                console.log(`      Current Step: ${lead.current_step}`);
                console.log(`      Status: ${lead.status}`);
                console.log(`      Next Action Due: ${lead.next_action_due || 'NULL'}`);
                console.log(`      ❌ No sequence step found for step_order = ${lead.current_step}`);
                console.log();
            });
        } else {
            console.log("✅ No stuck leads found.\n");
        }

        // 2. Check what sequences exist for each campaign
        console.log("2️⃣ Checking campaign sequences...\n");
        
        const campaignsWithLeads = await pool.query(`
            SELECT DISTINCT cl.campaign_id, c.name as campaign_name
            FROM campaign_leads cl
            LEFT JOIN campaigns c ON cl.campaign_id = c.id
            WHERE cl.status IN ('pending', 'ready_for_action')
        `);

        for (const campaign of campaignsWithLeads.rows) {
            const sequences = await pool.query(`
                SELECT step_order, type, delay_days, condition_type
                FROM sequences
                WHERE campaign_id = $1
                ORDER BY step_order
            `, [campaign.campaign_id]);

            const leadsInCampaign = await pool.query(`
                SELECT DISTINCT current_step, COUNT(*) as count
                FROM campaign_leads
                WHERE campaign_id = $1
                AND status IN ('pending', 'ready_for_action')
                GROUP BY current_step
            `, [campaign.campaign_id]);

            console.log(`   Campaign: ${campaign.campaign_name || `ID ${campaign.campaign_id}`}`);
            console.log(`   Sequences defined: ${sequences.rows.length}`);
            if (sequences.rows.length > 0) {
                sequences.rows.forEach(seq => {
                    console.log(`      Step ${seq.step_order}: ${seq.type} (delay: ${seq.delay_days} days)`);
                });
            } else {
                console.log(`      ⚠️ No sequences defined for this campaign!`);
            }
            
            console.log(`   Leads waiting:`);
            if (leadsInCampaign.rows.length > 0) {
                leadsInCampaign.rows.forEach(lead => {
                    const hasSequence = sequences.rows.some(s => s.step_order === lead.current_step);
                    const status = hasSequence ? '✅' : '❌';
                    console.log(`      ${status} Step ${lead.current_step}: ${lead.count} lead(s)`);
                });
            } else {
                console.log(`      None`);
            }
            console.log();
        }

        // 3. Check for leads that should be processed
        console.log("3️⃣ Checking leads that should be processed...\n");
        
        const dueLeads = await pool.query(`
            SELECT 
                cl.*, 
                s.type as step_type, 
                s.step_order,
                l.full_name
            FROM campaign_leads cl
            JOIN sequences s ON cl.campaign_id = s.campaign_id AND cl.current_step = s.step_order
            JOIN leads l ON cl.lead_id = l.id
            WHERE (cl.next_action_due <= NOW() OR cl.next_action_due IS NULL)
            AND cl.status NOT IN ('failed', 'completed', 'processing', 'needs_approval')
            AND (cl.status = 'pending' OR cl.status = 'ready_for_action')
            LIMIT 10
        `);

        if (dueLeads.rows.length > 0) {
            console.log(`✅ Found ${dueLeads.rows.length} lead(s) ready for processing:\n`);
            dueLeads.rows.forEach((lead, idx) => {
                console.log(`   ${idx + 1}. ${lead.full_name} (Lead ID: ${lead.lead_id})`);
                console.log(`      Campaign: ${lead.campaign_id}, Step: ${lead.current_step} (${lead.step_type})`);
                console.log(`      Status: ${lead.status}`);
                console.log(`      Next Action Due: ${lead.next_action_due || 'NULL'}`);
                console.log();
            });
        } else {
            console.log("ℹ️ No leads ready for processing right now.\n");
        }

        // 4. Summary
        console.log("4️⃣ Summary:\n");
        
        const totalPending = await pool.query(`
            SELECT COUNT(*) as count FROM campaign_leads 
            WHERE status IN ('pending', 'ready_for_action')
        `);
        
        const totalWithSequences = await pool.query(`
            SELECT COUNT(*) as count FROM campaign_leads cl
            JOIN sequences s ON cl.campaign_id = s.campaign_id AND cl.current_step = s.step_order
            WHERE cl.status IN ('pending', 'ready_for_action')
        `);

        console.log(`   Total pending/ready_for_action leads: ${totalPending.rows[0].count}`);
        console.log(`   Leads with matching sequences: ${totalWithSequences.rows[0].count}`);
        console.log(`   Stuck leads (no sequence match): ${stuckLeads.rows.length}`);

        if (stuckLeads.rows.length > 0) {
            console.log("\n💡 To fix stuck leads:");
            console.log("   1. Check if campaigns have sequences defined");
            console.log("   2. Verify step_order matches current_step in campaign_leads");
            console.log("   3. Create missing sequence steps or update campaign_leads.current_step");
            console.log("   4. In the CRM UI, open the campaign’s Sequence tab and ensure step 1 is configured (typically as a connection_request).");
        }

        console.log("\n✅ Diagnosis complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

diagnoseScheduler();
