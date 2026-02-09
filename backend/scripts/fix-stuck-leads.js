import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import pool from "../src/db.js";

/**
 * Fix stuck leads that don't have matching sequence steps
 * Options:
 * 1. Mark as completed (if campaign is invalid/incomplete)
 * 2. Remove from campaign
 * 3. Create default sequences for campaigns missing them
 */
async function fixStuckLeads(options = {}) {
    const {
        action = 'complete', // 'complete', 'remove', 'create_sequences'
        campaignId = null // If specified, only fix this campaign
    } = options;

    try {
        console.log("🔧 Fixing Stuck Leads...\n");

        // Find stuck leads
        const stuckLeadsQuery = `
            SELECT 
                cl.campaign_id,
                cl.lead_id,
                cl.current_step,
                cl.status,
                l.full_name,
                c.name as campaign_name,
                c.status as campaign_status
            FROM campaign_leads cl
            JOIN leads l ON cl.lead_id = l.id
            LEFT JOIN campaigns c ON cl.campaign_id = c.id
            LEFT JOIN sequences s ON cl.campaign_id = s.campaign_id AND cl.current_step = s.step_order
            WHERE cl.status IN ('pending', 'ready_for_action')
            AND (cl.next_action_due <= NOW() OR cl.next_action_due IS NULL)
            AND s.id IS NULL
            ${campaignId ? 'AND cl.campaign_id = $1' : ''}
        `;

        const params = campaignId ? [campaignId] : [];
        const stuckLeads = await pool.query(stuckLeadsQuery, params);

        if (stuckLeads.rows.length === 0) {
            console.log("✅ No stuck leads found.\n");
            return;
        }

        console.log(`⚠️ Found ${stuckLeads.rows.length} stuck lead(s):\n`);
        stuckLeads.rows.forEach((lead, idx) => {
            console.log(`   ${idx + 1}. Lead ${lead.lead_id} (${lead.full_name})`);
            console.log(`      Campaign: ${lead.campaign_name || `ID ${lead.campaign_id}`} (${lead.campaign_status})`);
            console.log(`      Current Step: ${lead.current_step}`);
            console.log(`      Status: ${lead.status}`);
        });
        console.log();

        // Group by campaign to check sequences
        const campaignsToFix = {};
        for (const lead of stuckLeads.rows) {
            if (!campaignsToFix[lead.campaign_id]) {
                campaignsToFix[lead.campaign_id] = {
                    name: lead.campaign_name,
                    status: lead.campaign_status,
                    leads: []
                };
            }
            campaignsToFix[lead.campaign_id].leads.push(lead);
        }

        // Check sequences for each campaign
        for (const [campaignId, campaign] of Object.entries(campaignsToFix)) {
            const sequences = await pool.query(
                "SELECT step_order, type FROM sequences WHERE campaign_id = $1 ORDER BY step_order",
                [campaignId]
            );

            console.log(`\n📋 Campaign: ${campaign.name || `ID ${campaignId}`}`);
            console.log(`   Status: ${campaign.status}`);
            console.log(`   Sequences defined: ${sequences.rows.length}`);
            console.log(`   Stuck leads: ${campaign.leads.length}`);

            if (action === 'create_sequences' && sequences.rows.length === 0) {
                // Create default sequences
                console.log(`   🔨 Creating default sequences...`);
                
                // Create Step 1: Connection Request
                await pool.query(
                    `INSERT INTO sequences (campaign_id, step_order, type, delay_days, content)
                     VALUES ($1, 1, 'connection_request', 0, 'Hi {firstName}, I\'d like to connect with you.')`,
                    [campaignId]
                );

                // Create Step 2: Follow-up Message
                await pool.query(
                    `INSERT INTO sequences (campaign_id, step_order, type, delay_days, content)
                     VALUES ($1, 2, 'message', 3, 'Hi {firstName}, thanks for connecting! I wanted to reach out about...')`,
                    [campaignId]
                );

                console.log(`   ✅ Created default sequences (Step 1: connection_request, Step 2: message)`);
                
                // Update campaign status if it's draft
                if (campaign.status === 'draft') {
                    await pool.query(
                        "UPDATE campaigns SET status = 'draft' WHERE id = $1",
                        [campaignId]
                    );
                }
            } else if (action === 'complete') {
                // Mark stuck leads as completed
                console.log(`   ✅ Marking ${campaign.leads.length} lead(s) as completed...`);
                
                for (const lead of campaign.leads) {
                    await pool.query(
                        `UPDATE campaign_leads 
                         SET status = 'completed', 
                             next_action_due = NULL, 
                             last_activity_at = NOW()
                         WHERE campaign_id = $1 AND lead_id = $2`,
                        [lead.campaign_id, lead.lead_id]
                    );
                }
            } else if (action === 'remove') {
                // Remove leads from campaign
                console.log(`   🗑️ Removing ${campaign.leads.length} lead(s) from campaign...`);
                
                for (const lead of campaign.leads) {
                    await pool.query(
                        "DELETE FROM campaign_leads WHERE campaign_id = $1 AND lead_id = $2",
                        [lead.campaign_id, lead.lead_id]
                    );
                }
            }
        }

        console.log("\n✅ Fix complete!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    action: 'complete' // default
};

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--action' && args[i + 1]) {
        options.action = args[i + 1];
        i++;
    } else if (args[i] === '--campaign-id' && args[i + 1]) {
        options.campaignId = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--help') {
        console.log(`
Usage: node scripts/fix-stuck-leads.js [options]

Options:
  --action <action>        Action to take: 'complete', 'remove', or 'create_sequences' (default: complete)
  --campaign-id <id>       Only fix leads for this specific campaign ID
  --help                   Show this help message

Examples:
  node scripts/fix-stuck-leads.js
  node scripts/fix-stuck-leads.js --action complete
  node scripts/fix-stuck-leads.js --action create_sequences
  node scripts/fix-stuck-leads.js --action remove --campaign-id 1
        `);
        process.exit(0);
    }
}

fixStuckLeads(options);
