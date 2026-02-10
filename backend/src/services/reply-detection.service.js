import pool from '../db.js';
import phantomService from './phantombuster.service.js';
import logger from '../utils/logger.js';
import emailService from './email.service.js';

class ReplyDetectionService {
    /**
     * Periodically check for replies for active campaigns
     */
    async checkAllActiveCampaigns() {
        try {
            logger.info('🔍 Starting reply detection for all active campaigns...');
            
            const activeCampaigns = await pool.query(
                "SELECT id FROM campaigns WHERE status = 'active'"
            );

            for (const campaign of activeCampaigns.rows) {
                await this.checkRepliesForCampaign(campaign.id);
            }
            
            logger.info('✅ Reply detection completed.');
        } catch (error) {
            logger.error('❌ Error in global reply detection:', error.message);
        }
    }

    /**
     * Check replies for a specific campaign
     */
    async checkRepliesForCampaign(campaignId) {
        try {
            logger.info(`🔍 Checking replies for campaign ${campaignId}...`);

            // Find leads who were sent a message but haven't replied yet
            // We only check leads where status is 'pending' (waiting for next step) or 'completed'
            // and where the last action was a LinkedIn message
            const leadsToCheck = await pool.query(`
                SELECT cl.*, l.linkedin_url, l.first_name, l.last_name, l.email
                FROM campaign_leads cl
                JOIN leads l ON cl.lead_id = l.id
                WHERE cl.campaign_id = $1
                AND cl.status IN ('pending', 'completed')
                AND cl.last_activity_at <= NOW() - INTERVAL '1 day'
                AND cl.current_step > 0
            `, [campaignId]);

            if (leadsToCheck.rows.length === 0) {
                logger.info(`   No leads need reply check for campaign ${campaignId}`);
                return;
            }

            logger.info(`   Found ${leadsToCheck.rows.length} leads to check for replies`);

            // For now, we'll simulate the inbox scraping or use a placeholder
            // In a real scenario, we'd launch a phantom for each lead or a bulk inbox scraper
            for (const lead of leadsToCheck.rows) {
                await this.checkLeadReply(lead);
            }

        } catch (error) {
            logger.error(`❌ Error checking replies for campaign ${campaignId}:`, error.message);
        }
    }

    /**
     * Check if a specific lead has replied
     */
    async checkLeadReply(lead) {
        try {
            // This is where we'd call PhantomBuster LinkedIn Inbox Scraper
            // For now, let's implement the logic for "If no reply after 3 days, failover to email"
            
            const daysSinceLastActivity = Math.floor((new Date() - new Date(lead.last_activity_at)) / (1000 * 60 * 60 * 24));
            
            // Logic: IF (days_since_message > 3 AND reply == false) THEN send_email()
            // We'll assume reply is false for now unless we implement the actual scraper
            const hasReplied = false; 

            if (!hasReplied && daysSinceLastActivity >= 3) {
                logger.info(`⚠️ Lead ${lead.lead_id} hasn't replied after ${daysSinceLastActivity} days. Triggering failover...`);
                
                if (lead.email) {
                    await this.triggerEmailFailover(lead);
                } else {
                    logger.warn(`   Lead ${lead.lead_id} has no email. Cannot failover.`);
                }
            } else if (hasReplied) {
                logger.info(`🎉 Lead ${lead.lead_id} has replied! Updating status...`);
                await pool.query(
                    "UPDATE campaign_leads SET status = 'replied', last_activity_at = NOW() WHERE campaign_id = $1 AND lead_id = $2",
                    [lead.campaign_id, lead.lead_id]
                );
                
                await pool.query(
                    "INSERT INTO automation_logs (campaign_id, lead_id, action, status, details) VALUES ($1, $2, $3, $4, $5)",
                    [lead.campaign_id, lead.lead_id, 'reply_detected', 'detected', JSON.stringify({ detected_at: new Date() })]
                );
            }
        } catch (error) {
            logger.error(`❌ Error checking reply for lead ${lead.lead_id}:`, error.message);
        }
    }

    /**
     * Trigger email failover for a lead
     */
    async triggerEmailFailover(lead) {
        try {
            logger.info(`📨 Sending failover email to ${lead.email}...`);
            
            // Generate content or use campaign template
            const enrichmentRes = await pool.query("SELECT * FROM lead_enrichment WHERE lead_id = $1", [lead.lead_id]);
            const enrichment = enrichmentRes.rows[0];
            
            const profile = {
                id: lead.lead_id,
                first_name: lead.first_name,
                last_name: lead.last_name,
                full_name: `${lead.first_name} ${lead.last_name}`,
                email: lead.email
            };

            await emailService.sendFailoverEmail(profile, lead.campaign_id, enrichment);
            
            // Update lead status to prevent duplicate failover
            await pool.query(
                "UPDATE campaign_leads SET status = 'completed', last_activity_at = NOW() WHERE campaign_id = $1 AND lead_id = $2",
                [lead.campaign_id, lead.lead_id]
            );

            logger.info(`✅ Failover email sent and status updated for lead ${lead.lead_id}`);
        } catch (error) {
            logger.error(`❌ Failed to trigger failover for lead ${lead.lead_id}:`, error.message);
        }
    }
}

export default new ReplyDetectionService();
