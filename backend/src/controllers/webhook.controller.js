import pool from '../db.js';
import { advanceStep } from '../services/scheduler.service.js';

export const handlePhantomBusterWebhook = async (req, res) => {
    try {
        const payload = req.body;
        console.log("📥 Received PhantomBuster Webhook:", JSON.stringify(payload, null, 2));

        // PhantomBuster payload typically contains:
        // containerId: ID of the run
        // status: "finished", "success", or "error"
        // exitCode: 0 for success
        // resultObject: Link to data

        const { containerId, status, exitCode, phantomId } = payload;

        // 1. Log the event for debugging
        await pool.query(
            "INSERT INTO automation_logs (event_type, details) VALUES ($1, $2)",
            ['webhook_received', JSON.stringify({ containerId, status, exitCode, phantomId })]
        );

        // 2. Identify which lead this corresponds to
        // Match by the exact containerId we saved when launching the phantom

        let updateStatus = 'completed';
        if (status === 'error' || exitCode !== 0) {
            updateStatus = 'failed';
        }

        // Get the full lead data including current_step before updating
        const leadResult = await pool.query(`
            SELECT lead_id, campaign_id, current_step
            FROM campaign_leads 
            WHERE last_container_id = $1
        `, [containerId]);

        if (leadResult.rows.length > 0) {
            const lead = leadResult.rows[0];
            
            // Update the lead status
            await pool.query(`
                UPDATE campaign_leads 
                SET status = $1, last_activity_at = NOW()
                WHERE last_container_id = $2
            `, [updateStatus, containerId]);

            console.log(`✅ Webhook updated Lead ${lead.lead_id} to ${updateStatus}`);

            // If it succeeded, advance to the next step
            if (updateStatus === 'completed') {
                try {
                    await advanceStep(lead);
                    console.log(`✅ Webhook advanced Lead ${lead.lead_id} to next step`);
                } catch (advanceError) {
                    console.error(`❌ Failed to advance step for Lead ${lead.lead_id}:`, advanceError.message);
                    // Don't fail the webhook response, just log the error
                }
            }
        } else {
            console.warn(`⚠️ Webhook received for Job ${containerId} but no matching lead found.`);
        }

        // 3. Always respond with 200 OK so PhantomBuster knows we got it
        res.status(200).json({ received: true });

    } catch (error) {
        console.error("❌ Webhook Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
