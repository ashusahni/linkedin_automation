import express from 'express';
import emailService from '../services/email.service.js';
import pool from '../db.js';

const router = express.Router();

/**
 * POST /api/email/test
 * Send a test email to verify configuration
 */
router.post('/test', async (req, res) => {
    try {
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'Recipient email (to) is required' });
        }

        if (!emailService.isConfigured()) {
            return res.status(503).json({
                error: 'Email service not configured',
                message: 'Please set SENDGRID_API_KEY or AWS SES credentials in .env'
            });
        }

        const result = await emailService.sendTestEmail(to);

        return res.json({
            success: true,
            message: `Test email sent to ${to}`,
            provider: result.provider
        });
    } catch (error) {
        console.error('Test email error:', error);
        return res.status(500).json({
            error: 'Failed to send test email',
            details: error.message
        });
    }
});

/**
 * POST /api/email/failover/:leadId
 * Manually trigger failover email for a specific lead
 */
router.post('/failover/:leadId', async (req, res) => {
    try {
        const { leadId } = req.params;
        const { campaignId } = req.body;

        if (!campaignId) {
            return res.status(400).json({ error: 'campaignId is required' });
        }

        if (!emailService.isConfigured()) {
            return res.status(503).json({
                error: 'Email service not configured',
                message: 'Please set SENDGRID_API_KEY or AWS SES credentials in .env'
            });
        }

        // Get lead details
        const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
        if (leadResult.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        const lead = leadResult.rows[0];

        if (!lead.email) {
            return res.status(400).json({ error: 'Lead has no email address' });
        }

        // Get enrichment data
        const enrichmentResult = await pool.query(
            'SELECT * FROM lead_enrichment WHERE lead_id = $1',
            [leadId]
        );
        const enrichment = enrichmentResult.rows[0];

        // Send failover email
        const result = await emailService.sendFailoverEmail(lead, campaignId, enrichment);

        return res.json({
            success: true,
            message: `Failover email sent to ${lead.email}`,
            provider: result.provider,
            lead: {
                id: lead.id,
                name: lead.full_name,
                email: lead.email
            }
        });
    } catch (error) {
        console.error('Failover email error:', error);
        return res.status(500).json({
            error: 'Failed to send failover email',
            details: error.message
        });
    }
});

/**
 * GET /api/email/status
 * Check email service configuration status
 */
router.get('/status', (req, res) => {
    const isConfigured = emailService.isConfigured();
    const provider = emailService.provider;

    return res.json({
        configured: isConfigured,
        provider: provider || 'none',
        senderEmail: process.env.SENDER_EMAIL || 'not set',
        message: isConfigured
            ? `Email service is configured using ${provider}`
            : 'Email service not configured. Set SENDGRID_API_KEY or AWS SES credentials.'
    });
});

export default router;
