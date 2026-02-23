import pool from '../db.js';
import outreachService from '../services/outreach.service.js';

// POST /api/campaigns/:id/outreach/email
// Send email to selected leads using scraped email
export async function sendBulkEmailOutreach(req, res) {
    try {
        const { id } = req.params;
        const { leadIds, message, options = {} } = req.body;

        console.log(`\n📧 ============================================`);
        console.log(`📧 BULK EMAIL OUTREACH - Campaign ${id}`);
        console.log(`📧 ============================================\n`);

        if (!leadIds || leadIds.length === 0) {
            return res.status(400).json({ error: 'No leads selected' });
        }

        // Get leads with emails
        const leadsResult = await pool.query(`
            SELECT l.id, l.first_name, l.last_name, l.email, l.title, l.company, l.linkedin_url
            FROM campaign_leads cl
            JOIN leads l ON cl.lead_id = l.id
            WHERE cl.campaign_id = $1 AND l.id = ANY($2::int[])
        `, [id, leadIds]);

        const leads = leadsResult.rows;
        
        // Filter leads with emails
        const leadsWithEmail = leads.filter(l => l.email);
        const leadsWithoutEmail = leads.filter(l => !l.email);

        console.log(`📊 Total leads: ${leads.length}`);
        console.log(`   ✅ With email: ${leadsWithEmail.length}`);
        console.log(`   ❌ Without email: ${leadsWithoutEmail.length}`);

        if (leadsWithEmail.length === 0) {
            return res.status(400).json({ 
                error: 'None of the selected leads have email addresses',
                details: 'Run the contact scraper first to get email addresses'
            });
        }

        const results = {
            total: leads.length,
            sent: 0,
            failed: 0,
            noEmail: leadsWithoutEmail.length,
            details: []
        };

        // Send emails
        for (const lead of leadsWithEmail) {
            const result = await outreachService.sendEmailOutreach(
                lead,
                id,
                message,
                {
                    ...options,
                    useAI: !message || options.useAI === true
                }
            );

            if (result.success) {
                results.sent++;
            } else {
                results.failed++;
            }

            results.details.push({
                leadId: lead.id,
                name: `${lead.first_name} ${lead.last_name}`,
                email: lead.email,
                success: result.success,
                error: result.error
            });

            // Delay between emails to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n✅ Bulk email outreach complete:`);
        console.log(`   Sent: ${results.sent}/${leadsWithEmail.length}`);
        console.log(`   Failed: ${results.failed}`);

        return res.json({
            success: true,
            message: `Sent ${results.sent} emails (${results.failed} failed, ${results.noEmail} without email)`,
            results
        });

    } catch (error) {
        console.error('Bulk email outreach error:', error);
        res.status(500).json({ error: error.message });
    }
}

// POST /api/campaigns/:id/outreach/sms
// Send SMS to selected leads using scraped phone
export async function sendBulkSMSOutreach(req, res) {
    try {
        const { id } = req.params;
        const { leadIds, message, options = {} } = req.body;

        console.log(`\n📱 ============================================`);
        console.log(`📱 BULK SMS OUTREACH - Campaign ${id}`);
        console.log(`📱 ============================================\n`);

        if (!leadIds || leadIds.length === 0) {
            return res.status(400).json({ error: 'No leads selected' });
        }

        // Get leads with phone numbers
        const leadsResult = await pool.query(`
            SELECT l.id, l.first_name, l.last_name, l.phone, l.title, l.company
            FROM campaign_leads cl
            JOIN leads l ON cl.lead_id = l.id
            WHERE cl.campaign_id = $1 AND l.id = ANY($2::int[])
        `, [id, leadIds]);

        const leads = leadsResult.rows;
        const leadsWithPhone = leads.filter(l => l.phone);
        const leadsWithoutPhone = leads.filter(l => !l.phone);

        console.log(`📊 Total leads: ${leads.length}`);
        console.log(`   ✅ With phone: ${leadsWithPhone.length}`);
        console.log(`   ❌ Without phone: ${leadsWithoutPhone.length}`);

        if (leadsWithPhone.length === 0) {
            return res.status(400).json({ 
                error: 'None of the selected leads have phone numbers',
                details: 'Run the contact scraper first to get phone numbers'
            });
        }

        const results = {
            total: leads.length,
            sent: 0,
            failed: 0,
            noPhone: leadsWithoutPhone.length,
            details: []
        };

        // Send SMS
        for (const lead of leadsWithPhone) {
            const result = await outreachService.sendSMSOutreach(
                lead,
                id,
                message,
                {
                    ...options,
                    useAI: !message || options.useAI === true
                }
            );

            if (result.success) {
                results.sent++;
            } else {
                results.failed++;
            }

            results.details.push({
                leadId: lead.id,
                name: `${lead.first_name} ${lead.last_name}`,
                phone: lead.phone,
                success: result.success,
                note: result.note,
                error: result.error
            });

            // Delay between SMS to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`\n✅ Bulk SMS outreach complete:`);
        console.log(`   Sent: ${results.sent}/${leadsWithPhone.length}`);
        console.log(`   Failed: ${results.failed}`);

        return res.json({
            success: true,
            message: `Processed ${results.sent} SMS (${results.failed} failed, ${results.noPhone} without phone)`,
            results,
            note: 'SMS sending requires Twilio integration. See outreach.service.js'
        });

    } catch (error) {
        console.error('Bulk SMS outreach error:', error);
        res.status(500).json({ error: error.message });
    }
}

// GET /api/campaigns/:id/outreach/stats
// Get outreach statistics for a campaign
export async function getOutreachStats(req, res) {
    try {
        const { id } = req.params;
        
        const stats = await outreachService.getOutreachStats(id);
        
        return res.json(stats);
    } catch (error) {
        console.error('Get outreach stats error:', error);
        res.status(500).json({ error: error.message });
    }
}
