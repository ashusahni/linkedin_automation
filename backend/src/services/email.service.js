import sgMail from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import pool from '../db.js';
import AIService from './ai.service.js';

// Email service with dual support for SendGrid and AWS SES
class EmailService {
    constructor() {
        this.provider = null;
        this.sesClient = null;
        this.initialize();
    }

    /**
     * Initialize email service based on available credentials
     */
    initialize() {
        // Check for SendGrid
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.provider = 'sendgrid';
            console.log('✅ Email Service: Using SendGrid');
        }
        // Check for AWS SES
        else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            this.sesClient = new SESClient({
                region: process.env.AWS_REGION || 'us-east-1',
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                }
            });
            this.provider = 'aws-ses';
            console.log('✅ Email Service: Using AWS SES');
        }
        else {
            console.warn('⚠️ Email Service: No email provider configured (SendGrid or AWS SES)');
            this.provider = null;
        }
    }

    /**
     * Check if email service is configured
     */
    isConfigured() {
        return this.provider !== null;
    }

    /**
     * Send email via SendGrid
     */
    async sendViaSendGrid(to, subject, text, html) {
        const msg = {
            to,
            from: process.env.SENDER_EMAIL || 'noreply@example.com',
            subject,
            text,
            html
        };

        try {
            await sgMail.send(msg);
            return { success: true, provider: 'sendgrid' };
        } catch (error) {
            console.error('SendGrid Error:', error.response?.body || error.message);
            throw new Error(`SendGrid failed: ${error.message}`);
        }
    }

    /**
     * Send email via AWS SES
     */
    async sendViaAWS(to, subject, text, html) {
        const params = {
            Source: process.env.SENDER_EMAIL || 'noreply@example.com',
            Destination: {
                ToAddresses: [to]
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: 'UTF-8'
                },
                Body: {
                    Text: {
                        Data: text,
                        Charset: 'UTF-8'
                    },
                    Html: {
                        Data: html,
                        Charset: 'UTF-8'
                    }
                }
            }
        };

        try {
            const command = new SendEmailCommand(params);
            const response = await this.sesClient.send(command);
            return { success: true, provider: 'aws-ses', messageId: response.MessageId };
        } catch (error) {
            console.error('AWS SES Error:', error);
            throw new Error(`AWS SES failed: ${error.message}`);
        }
    }

    /**
     * Send email (automatically chooses provider)
     */
    async sendEmail(to, subject, text, html = null) {
        if (!this.isConfigured()) {
            console.warn('⚠️ Email not sent - no provider configured');
            return { success: false, error: 'No email provider configured' };
        }

        if (!to) {
            throw new Error('Recipient email address is required');
        }

        // Generate HTML from text if not provided
        if (!html) {
            html = `<p>${text.replace(/\n/g, '<br>')}</p>`;
        }

        try {
            let result;
            if (this.provider === 'sendgrid') {
                result = await this.sendViaSendGrid(to, subject, text, html);
            } else if (this.provider === 'aws-ses') {
                result = await this.sendViaAWS(to, subject, text, html);
            }

            console.log(`✅ Email sent to ${to} via ${result.provider}`);
            return result;
        } catch (error) {
            console.error(`❌ Email send failed:`, error.message);
            throw error;
        }
    }

    /**
     * Send LinkedIn failover email
     */
    async sendFailoverEmail(lead, campaignId, enrichment = null) {
        try {
            if (!lead.email) {
                throw new Error('Lead has no email address');
            }

            console.log(`📧 Sending failover email to ${lead.full_name} (${lead.email})`);

            // Generate AI-powered email content
            const emailBody = await AIService.generateEmailFailover(lead, enrichment);

            // Create subject line
            const subject = `Following up - ${lead.first_name}`;

            // Send email
            const result = await this.sendEmail(
                lead.email,
                subject,
                emailBody,
                this.generateEmailHTML(lead, emailBody)
            );

            // Log the email send
            await pool.query(
                `INSERT INTO automation_logs (campaign_id, lead_id, action, status, details)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    campaignId,
                    lead.id,
                    'email_failover',
                    result.success ? 'success' : 'failed',
                    JSON.stringify({
                        email: lead.email,
                        provider: result.provider,
                        messageId: result.messageId,
                        subject
                    })
                ]
            );

            return result;
        } catch (error) {
            console.error('❌ Failover email error:', error.message);

            // Log the failure
            await pool.query(
                `INSERT INTO automation_logs (campaign_id, lead_id, action, status, details)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    campaignId,
                    lead.id,
                    'email_failover',
                    'failed',
                    JSON.stringify({ error: error.message, email: lead.email })
                ]
            );

            throw error;
        }
    }

    /**
     * Generate HTML email template
     */
    generateEmailHTML(lead, content) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .email-container {
            background: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .email-content {
            margin: 20px 0;
            white-space: pre-wrap;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
        }
        .unsubscribe {
            color: #999;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-content">
${content.replace(/\n/g, '<br>')}
        </div>
        
        <div class="footer">
            <p>This email was sent because we connected on LinkedIn.</p>
            <p>If you'd prefer not to receive these emails, please <a href="#" class="unsubscribe">let us know</a>.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
    }

    /**
     * Send test email
     */
    async sendTestEmail(to) {
        const subject = 'Test Email - LinkedIn Automation System';
        const text = `Hello!

This is a test email from your LinkedIn automation system.

If you're seeing this, your email service is configured correctly!

Provider: ${this.provider}
Time: ${new Date().toISOString()}

Best regards,
LinkedIn Automation System`;

        return await this.sendEmail(to, subject, text);
    }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
