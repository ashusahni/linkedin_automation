import express from 'express';
import { ContentService } from '../services/content.service.js';
import { ConnectionService } from '../services/connection.service.js';
import { ApprovalService } from '../services/approval.service.js';

const router = express.Router();

// --- CONTENT ENGINE ---
router.get('/content/feeds', async (req, res) => {
    try {
        const feeds = await ContentService.getFeeds();
        res.json(feeds);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

router.post('/content/feeds', async (req, res) => {
    try {
        const feed = await ContentService.addFeed(req.body);
        res.json(feed);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

router.post('/content/fetch', async (req, res) => {
    try {
        const posts = await ContentService.fetchExternalNews();
        res.json(posts);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

router.get('/content/posts', async (req, res) => {
    try {
        const posts = await ContentService.getPosts(req.query.status || 'all');
        res.json(posts);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

router.put('/content/posts/:id/status', async (req, res) => {
    try {
        const { status, content } = req.body;
        const post = await ContentService.updatePostStatus(req.params.id, status, content);
        res.json(post);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

// --- CONNECTION AUDIT ---
router.get('/connections', async (req, res) => {
    try {
        const conns = await ConnectionService.getConnections();
        res.json(conns);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

router.post('/connections/sync', async (req, res) => {
    try {
        const result = await ConnectionService.simulateSync();
        res.json(result);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

// --- APPROVALS ---
router.get('/approvals', async (req, res) => {
    try {
        const campaignId = req.query.campaign_id ? parseInt(req.query.campaign_id) : null;
        const items = await ApprovalService.getPendingItems(campaignId);
        res.json(items);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

router.post('/approvals/:id/review', async (req, res) => {
    try {
        const { action, modifiedContent } = req.body; // 'approve', 'reject'
        const item = await ApprovalService.processItem(req.params.id, action, modifiedContent);
        res.json(item);
    } catch (e) {
        console.error('Approval review error:', e);
        res.status(500).json({ error: e.message || 'Failed to process approval' });
    }
});

router.put('/approvals/:id/edit', async (req, res) => {
    try {
        const { content } = req.body;
        const item = await ApprovalService.editContent(req.params.id, content);
        res.json(item);
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

// Regenerate message with personalization options (tone, length, focus)
router.post('/approvals/:id/regenerate', async (req, res) => {
    try {
        const pool = (await import('../db.js')).default;
        const { default: AIService } = await import('../services/ai.service.js');
        const id = parseInt(req.params.id, 10);
        const { tone, length, focus } = req.body || {};

        const approvalResult = await pool.query(
            'SELECT * FROM approval_queue WHERE id = $1 AND status = $2',
            [id, 'pending']
        );
        if (approvalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Approval not found or already processed' });
        }
        const approval = approvalResult.rows[0];

        const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [approval.lead_id]);
        if (leadResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        const lead = leadResult.rows[0];

        const enrichmentResult = await pool.query(
            'SELECT * FROM lead_enrichment WHERE lead_id = $1',
            [approval.lead_id]
        );
        const enrichment = enrichmentResult.rows[0] || null;

        // Fetch campaign context if available
        let campaignContext = null;
        if (approval.campaign_id) {
            const campaignResult = await pool.query('SELECT goal, type, description, target_audience FROM campaigns WHERE id = $1', [approval.campaign_id]);
            if (campaignResult.rows.length > 0) {
                campaignContext = {
                    goal: campaignResult.rows[0].goal,
                    type: campaignResult.rows[0].type,
                    description: campaignResult.rows[0].description,
                    target_audience: campaignResult.rows[0].target_audience
                };
            }
        }

        const options = {};
        if (tone) options.tone = tone;
        if (length) options.length = length;
        if (focus) options.focus = focus;
        if (campaignContext) options.campaign = campaignContext;

        let content;
        if (approval.step_type === 'connection_request') {
            content = await AIService.generateConnectionRequest(lead, enrichment, options);
        } else if (approval.step_type === 'gmail_outreach' || approval.step_type === 'email') {
            const draft = await AIService.generateGmailDraft(lead, enrichment, options);
            content = JSON.stringify({ subject: draft.subject, body: draft.body });
        } else {
            content = await AIService.generateFollowUpMessage(lead, enrichment, [], options);
        }

        await ApprovalService.editContent(id, content);

        res.json({
            content,
            aiUnavailable: !AIService.isConfigured(),
        });
    } catch (e) {
        console.error('Regenerate approval error:', e);
        res.status(500).json({ error: e.message || 'Failed to regenerate message' });
    }
});

// Bulk personalize and regenerate multiple approvals
router.post('/approvals/bulk-personalize', async (req, res) => {
    try {
        const pool = (await import('../db.js')).default;
        const { default: AIService } = await import('../services/ai.service.js');
        const { ids, tone, length, focus } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }

        console.log(`\n🎨 Bulk personalizing ${ids.length} messages...`);
        console.log(`   Tone: ${tone || 'default'}, Length: ${length || 'default'}, Focus: ${focus || 'default'}`);

        const options = {};
        if (tone) options.tone = tone;
        if (length) options.length = length;
        if (focus) options.focus = focus;

        // Get all approvals and their lead data
        const approvalsResult = await pool.query(
            'SELECT * FROM approval_queue WHERE id = ANY($1::int[]) AND status = $2',
            [ids, 'pending']
        );

        if (approvalsResult.rows.length === 0) {
            return res.status(404).json({ error: 'No pending approvals found for given IDs' });
        }

        const regenerated = [];
        const errors = [];

        for (const approval of approvalsResult.rows) {
            try {
                // Get lead data
                const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [approval.lead_id]);
                if (leadResult.rows.length === 0) {
                    errors.push({ id: approval.id, error: 'Lead not found' });
                    continue;
                }
                const lead = leadResult.rows[0];

                // Get enrichment data
                const enrichmentResult = await pool.query(
                    'SELECT * FROM lead_enrichment WHERE lead_id = $1',
                    [approval.lead_id]
                );
                const enrichment = enrichmentResult.rows[0] || null;

                // Fetch campaign context if available
                let campaignContext = null;
                if (approval.campaign_id) {
                    const campaignResult = await pool.query('SELECT goal, type, description, target_audience FROM campaigns WHERE id = $1', [approval.campaign_id]);
                    if (campaignResult.rows.length > 0) {
                        campaignContext = {
                            goal: campaignResult.rows[0].goal,
                            type: campaignResult.rows[0].type,
                            description: campaignResult.rows[0].description,
                            target_audience: campaignResult.rows[0].target_audience
                        };
                    }
                }
                if (campaignContext) options.campaign = campaignContext;

                // Generate personalized content
                let content;
                if (approval.step_type === 'connection_request') {
                    content = await AIService.generateConnectionRequest(lead, enrichment, options);
                } else if (approval.step_type === 'gmail_outreach' || approval.step_type === 'email') {
                    const draft = await AIService.generateGmailDraft(lead, enrichment, options);
                    content = JSON.stringify({ subject: draft.subject, body: draft.body });
                } else {
                    content = await AIService.generateFollowUpMessage(lead, enrichment, [], options);
                }

                // Update approval with new content
                await ApprovalService.editContent(approval.id, content);

                regenerated.push({
                    id: approval.id,
                    lead_id: approval.lead_id,
                    lead_name: `${lead.first_name} ${lead.last_name}`,
                    content
                });

                console.log(`   ✅ Regenerated for ${lead.first_name} ${lead.last_name}`);

            } catch (error) {
                console.error(`   ❌ Failed for approval ${approval.id}:`, error.message);
                errors.push({ id: approval.id, error: error.message });
            }
        }

        console.log(`\n✅ Bulk personalization complete: ${regenerated.length} success, ${errors.length} failed`);

        res.json({
            success: true,
            regenerated: regenerated.length,
            failed: errors.length,
            items: regenerated,
            errors: errors.length > 0 ? errors : undefined,
            aiUnavailable: !AIService.isConfigured()
        });

    } catch (e) {
        console.error('Bulk personalize error:', e);
        res.status(500).json({ error: e.message || 'Failed to bulk personalize' });
    }
});

router.post('/approvals/bulk-approve', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        const items = await ApprovalService.bulkApprove(ids);
        res.json({ success: true, approved: items.length, items });
    } catch (e) {
        console.error('Bulk approve error:', e);
        res.status(500).json({ error: e.message || 'Bulk approve failed' });
    }
});

router.post('/approvals/bulk-reject', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'ids array is required' });
        }
        const items = await ApprovalService.bulkReject(ids);
        res.json({ success: true, rejected: items.length, items });
    } catch (e) {
        console.error('SOW route error:', e);
        res.status(500).json({ error: e.message || 'Request failed' });
    }
});

// Get sending status for an approval/lead
router.get('/approvals/:id/status', async (req, res) => {
    try {
        const pool = (await import('../db.js')).default;
        const approvalId = parseInt(req.params.id);
        
        // Get approval details
        const approvalResult = await pool.query(
            'SELECT * FROM approval_queue WHERE id = $1',
            [approvalId]
        );
        
        if (approvalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Approval not found' });
        }
        
        const approval = approvalResult.rows[0];
        
        // Get campaign_lead status and container ID
        const leadResult = await pool.query(
            `SELECT status, last_container_id, last_message_sent_at 
             FROM campaign_leads 
             WHERE campaign_id = $1 AND lead_id = $2`,
            [approval.campaign_id, approval.lead_id]
        );
        
        // Get lead name for better status display
        const leadNameResult = await pool.query(
            'SELECT first_name, last_name FROM leads WHERE id = $1',
            [approval.lead_id]
        );
        const leadName = leadNameResult.rows[0] ? 
            `${leadNameResult.rows[0].first_name} ${leadNameResult.rows[0].last_name}`.trim() : null;
        
        // Get automation logs for this lead
        const logsResult = await pool.query(
            `SELECT action, status, details, created_at 
             FROM automation_logs 
             WHERE campaign_id = $1 AND lead_id = $2 
             AND action IN ('send_message', 'send_connection_request', 'approval_reviewed')
             ORDER BY created_at DESC 
             LIMIT 10`,
            [approval.campaign_id, approval.lead_id]
        );
        
        const leadStatus = leadResult.rows[0] || {};
        const logs = logsResult.rows || [];
        
        // Determine sending status
        let sendingStatus = 'pending';
        let containerId = null;
        let sentAt = null;
        let errorMessage = null;
        
        if (approval.status === 'approved') {
            // Check logs for failures first
            const failedLog = logs.find(log => 
                (log.action === 'send_message' || log.action === 'send_connection_request') && 
                log.status === 'failed'
            );
            
            if (failedLog) {
                sendingStatus = 'failed';
                const details = typeof failedLog.details === 'string' ? JSON.parse(failedLog.details) : failedLog.details;
                errorMessage = details?.error || 'Failed to send message';
            } else {
                // Check logs for actual sending
                const sentLog = logs.find(log => 
                    (log.action === 'send_message' || log.action === 'send_connection_request') && 
                    log.status === 'sent'
                );
                
                if (sentLog) {
                    sendingStatus = 'sent';
                    const details = typeof sentLog.details === 'string' ? JSON.parse(sentLog.details) : sentLog.details;
                    containerId = details?.container_id || leadStatus.last_container_id;
                    sentAt = sentLog.created_at;
                } else if (leadStatus.last_container_id) {
                    sendingStatus = 'queued'; // Has container ID but no sent log yet
                    containerId = leadStatus.last_container_id;
                } else {
                    sendingStatus = 'queued'; // Approved but not yet picked up by scheduler
                }
            }
        } else if (approval.status === 'rejected') {
            sendingStatus = 'rejected';
        }
        
        res.json({
            approval_status: approval.status,
            sending_status: sendingStatus,
            container_id: containerId,
            sent_at: sentAt,
            error: errorMessage,
            lead_status: leadStatus.status,
            lead_name: leadName,
            logs: logs.map(log => ({
                action: log.action,
                status: log.status,
                timestamp: log.created_at,
                details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
            }))
        });
    } catch (e) { 
        console.error('Error fetching approval status:', e);
        res.status(500).json({ error: e.message }); 
    }
});

// Get recent sending activity for a campaign
router.get('/campaigns/:campaignId/activity', async (req, res) => {
    try {
        const pool = (await import('../db.js')).default;
        const campaignId = parseInt(req.params.campaignId);
        
        // Get recent automation logs for this campaign
        const logsResult = await pool.query(
            `SELECT 
                al.action, 
                al.status, 
                al.details, 
                al.created_at,
                l.first_name,
                l.last_name,
                l.linkedin_url,
                aq.step_type,
                aq.generated_content
             FROM automation_logs al
             LEFT JOIN leads l ON al.lead_id = l.id
             LEFT JOIN approval_queue aq ON aq.campaign_id = al.campaign_id AND aq.lead_id = al.lead_id
             WHERE al.campaign_id = $1 
             AND al.action IN ('send_message', 'send_connection_request', 'approval_reviewed')
             ORDER BY al.created_at DESC 
             LIMIT 50`,
            [campaignId]
        );
        
        const activities = logsResult.rows.map(log => {
            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
            return {
                id: log.id || Math.random(),
                action: log.action,
                status: log.status,
                lead_name: `${log.first_name || ''} ${log.last_name || ''}`.trim(),
                linkedin_url: log.linkedin_url,
                step_type: log.step_type,
                container_id: details?.container_id,
                message_preview: log.generated_content ? log.generated_content.substring(0, 100) : null,
                timestamp: log.created_at
            };
        });
        
        res.json({ activities });
    } catch (e) { 
        console.error('Error fetching activity:', e);
        res.status(500).json({ error: e.message }); 
    }
});

export default router;
