import pool from '../db.js';

export const ApprovalService = {
    // Add item to review queue
    async addToQueue(campaignId, leadId, stepType, content) {
        // Check if already exists to prevent duplicates
        const check = await pool.query(
            "SELECT * FROM approval_queue WHERE campaign_id = $1 AND lead_id = $2 AND status = 'pending'",
            [campaignId, leadId]
        );

        if (check.rows.length > 0) return check.rows[0];

        const result = await pool.query(
            `INSERT INTO approval_queue (campaign_id, lead_id, step_type, generated_content, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
            [campaignId, leadId, stepType, content]
        );
        return result.rows[0];
    },

    // Get pending items (optionally filtered by campaign)
    async getPendingItems(campaignId = null) {
        let query = `
            SELECT aq.*, l.first_name, l.last_name, l.company, l.title, l.linkedin_url, l.email, c.name as campaign_name
            FROM approval_queue aq
            JOIN campaign_leads cl ON aq.campaign_id = cl.campaign_id AND aq.lead_id = cl.lead_id
            JOIN leads l ON cl.lead_id = l.id
            JOIN campaigns c ON aq.campaign_id = c.id
            WHERE aq.status = 'pending'
        `;

        const params = [];
        if (campaignId) {
            query += ' AND aq.campaign_id = $1';
            params.push(campaignId);
        }

        query += ' ORDER BY aq.created_at ASC';

        const result = await pool.query(query, params);
        return result.rows;
    },

    // Edit approval content
    async editContent(id, newContent) {
        const result = await pool.query(
            `UPDATE approval_queue 
             SET generated_content = $1, updated_at = NOW()
             WHERE id = $2 RETURNING *`,
            [newContent, id]
        );
        return result.rows[0];
    },

    // Approve/Reject single item
    async processItem(id, action, modifiedContent = null) {
        // action: 'approve' or 'reject'
        const status = action === 'approve' ? 'approved' : 'rejected';

        const result = await pool.query(
            `UPDATE approval_queue 
       SET status = $1, generated_content = COALESCE($2, generated_content), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
            [status, modifiedContent, id]
        );

        const item = result.rows[0];
        if (!item) throw new Error('Approval not found or already processed');

        if (action === 'approve') {
            if (['connection_request', 'message'].includes(item.step_type)) {
                try {
                    const { sendApprovedLeadImmediately } = await import('./outreach.service.js');
                    await sendApprovedLeadImmediately(item.campaign_id, item.lead_id, item.step_type, item.generated_content, item.id);
                } catch (err) {
                    console.error('Outreach send on approve failed:', err.message);
                    await pool.query(`UPDATE campaign_leads SET status = 'pending', next_action_due = NOW() WHERE campaign_id = $1 AND lead_id = $2`, [item.campaign_id, item.lead_id]);
                }
            } else {
                await pool.query(`UPDATE campaign_leads SET status = 'pending', next_action_due = NOW() WHERE campaign_id = $1 AND lead_id = $2`, [item.campaign_id, item.lead_id]);
            }
        }

        return result.rows[0];
    },

    // Bulk approve items
    async bulkApprove(ids) {
        const result = await pool.query(
            `UPDATE approval_queue 
             SET status = 'approved', updated_at = NOW()
             WHERE id = ANY($1::int[]) AND status = 'pending'
             RETURNING *`,
            [ids]
        );

        // Immediately send for each approved lead (connection_request or message)
        for (const item of result.rows) {
            if (['connection_request', 'message'].includes(item.step_type)) {
                try {
                    const { sendApprovedLeadImmediately } = await import('./outreach.service.js');
                    await sendApprovedLeadImmediately(
                        item.campaign_id,
                        item.lead_id,
                        item.step_type,
                        item.generated_content,
                        item.id
                    );
                } catch (err) {
                    console.error(`Outreach send for lead ${item.lead_id} failed:`, err.message);
                    await pool.query(
                        `UPDATE campaign_leads 
                         SET status = 'pending', next_action_due = NOW()
                         WHERE campaign_id = $1 AND lead_id = $2`,
                        [item.campaign_id, item.lead_id]
                    );
                }
            } else {
                await pool.query(
                    `UPDATE campaign_leads 
                     SET status = 'pending', next_action_due = NOW()
                     WHERE campaign_id = $1 AND lead_id = $2`,
                    [item.campaign_id, item.lead_id]
                );
            }
        }

        return result.rows;
    },

    // Bulk reject items
    async bulkReject(ids) {
        const result = await pool.query(
            `UPDATE approval_queue 
             SET status = 'rejected', updated_at = NOW()
             WHERE id = ANY($1::int[]) AND status = 'pending'
             RETURNING *`,
            [ids]
        );
        return result.rows;
    }
};
