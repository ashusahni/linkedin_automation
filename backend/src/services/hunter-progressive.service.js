import pool from '../db.js';
import hunterService from './hunter.service.js';
import enrichmentService from './enrichment.service.js';
import logger from '../utils/logger.js';

class HunterProgressiveService {
    constructor() {
        this.isProcessing = false;
        this.batchSize = 50;
    }

    /**
     * Start the progressive enrichment background process
     * Maximum 50 leads per run, only eligible leads.
     */
    async startBatch() {
        if (this.isProcessing) {
            logger.warn('⚠️ Progressive Hunter batch already running');
            return { status: 'enrichment_started', message: 'Already processing a batch' };
        }

        // Start processing asynchronously without waiting
        this._processNextBatch().catch(err => {
            logger.error('❌ Progressive batch error (async):', err);
            this.isProcessing = false;
        });

        return { status: 'enrichment_started', message: 'Started processing up to 50 leads' };
    }

    /**
     * Background processor for up to 50 leads
     */
    async _processNextBatch() {
        this.isProcessing = true;

        try {
            // 1. Selection Query
            // First click -> processes first 0-50 eligible leads
            const query = `
                SELECT * FROM leads 
                WHERE email IS NULL 
                AND (enrichment_status IS NULL OR enrichment_status = 'pending') 
                ORDER BY 
                    preference_tier ASC, 
                    preference_score DESC, 
                    created_at ASC 
                LIMIT $1
            `;

            const result = await pool.query(query, [this.batchSize]);
            const leads = result.rows;

            if (leads.length === 0) {
                logger.info('✅ No more eligible leads to enrich progressively.');
                this.isProcessing = false;
                return;
            }

            logger.info(`🚀 Starting progressive Hunter enrichment for ${leads.length} leads...`);

            const leadIds = leads.map(l => l.id);

            // 2. Mark selected leads as 'processing'
            await pool.query(`
                UPDATE leads 
                SET enrichment_status = 'processing', updated_at = NOW() 
                WHERE id = ANY($1::int[])
            `, [leadIds]);

            // 3. Process one-by-one or in batches
            for (const lead of leads) {
                await this._processLead(lead);
            }

            logger.info(`✅ Progressive batch of ${leads.length} leads completed.`);
        } catch (error) {
            logger.error('❌ Error processing Hunter batch:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single lead
     */
    async _processLead(lead) {
        let domain = null;
        let finalStatus = 'failed';
        let retries = 2; // Retry 2 times if API fails

        try {
            let firstName = lead.first_name;
            let lastName = lead.last_name;

            // Infer domain from company
            domain = await enrichmentService._inferDomain(lead.company);

            // Fallback: Split full_name if parts are missing
            if ((!firstName || !lastName) && lead.full_name) {
                const parts = lead.full_name.trim().split(/\s+/);
                if (parts.length >= 2) {
                    firstName = parts[0];
                    lastName = parts.slice(1).join(' ');
                } else if (parts.length === 1) {
                    firstName = parts[0];
                    lastName = ''; // Hunter might struggle with no last name, but we can try
                }
            }

            if (!domain || !firstName || !lastName) {
                // If we don't have basic details to infer email
                await this._updateLeadStatus(lead.id, 'not_found', null, null, null, null);
                return;
            }

            let finderRes = null;
            let success = false;

            // Retry logic
            while (retries >= 0 && !success) {
                finderRes = await hunterService.findEmail(firstName, lastName, domain);

                if (finderRes.success) {
                    success = true;
                } else if (finderRes.status !== 429 && finderRes.status !== 500) {
                    // Don't retry if it's validation error or unauthorized
                    break;
                } else {
                    retries--;
                    if (retries >= 0) {
                        logger.info(`⚠️ Hunter API failing, retrying ${retries} more times...`);
                        await new Promise(r => setTimeout(r, 2000)); // Delay before retry
                    }
                }
            }

            if (!success || !finderRes || !finderRes.data || !finderRes.data.email) {
                finalStatus = 'not_found';
                await this._updateLeadStatus(lead.id, finalStatus, null, null, null, null);
                return;
            }

            const email = finderRes.data.email;
            const score = finderRes.data.score;
            let verifyStatus = 'unknown';
            let verifyScore = 0;

            // Verify email
            const verifyRes = await hunterService.verifyEmail(email);
            if (verifyRes.success && verifyRes.data) {
                verifyStatus = verifyRes.data.result;
                verifyScore = verifyRes.data.score;
            }

            // Save details
            await this._updateLeadStatus(
                lead.id,
                'completed',
                email,
                verifyScore,
                verifyStatus,
                score
            );

        } catch (error) {
            logger.error(`❌ Hunter progressive error for lead ${lead.id}:`, error.message);
            await this._updateLeadStatus(lead.id, 'failed', null, null, null, null);
        }
    }

    async _updateLeadStatus(leadId, status, email, emailScore, verificationStatus, hunterConfidence) {
        if (email) {
            await pool.query(`
                UPDATE leads 
                SET 
                    email = $1,
                    email_score = $2,
                    email_verification_status = $3,
                    hunter_confidence = $4,
                    email_source = 'hunter',
                    hunter_attempted = true,
                    enrichment_status = $5,
                    enriched_at = NOW(),
                    updated_at = NOW()
                WHERE id = $6
            `, [email, emailScore, verificationStatus, hunterConfidence, status, leadId]);
        } else {
            await pool.query(`
                UPDATE leads 
                SET 
                    hunter_attempted = true,
                    enrichment_status = $1,
                    enriched_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2
            `, [status, leadId]);
        }
    }
}

export default new HunterProgressiveService();
