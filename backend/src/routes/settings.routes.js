import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import contactScraperService from '../services/contact-scraper.service.js';
import profileEnrichmentService from '../services/profileEnrichment.service.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import config from '../config/index.js';

// Get branding / profile for dashboard welcome (user name, company, logo, profile image, theme)
router.get('/branding', (req, res) => {
    try {
        const branding = {
            userName: process.env.APP_USER_NAME || config.branding.userName || 'Rishab',
            companyName: process.env.APP_COMPANY_NAME || config.branding.companyName || 'Scottish Chemical Industries',
            logoUrl: process.env.APP_LOGO_URL || config.branding.logoUrl || '/logo.jpg',
            profileImageUrl: process.env.APP_PROFILE_IMAGE_URL || config.branding.profileImageUrl || '',
            theme: process.env.APP_THEME || config.branding.theme || 'default',
            linkedinAccountName: process.env.LINKEDIN_ACCOUNT_NAME || '',
            linkedinCookieConfigured: !!process.env.LINKEDIN_SESSION_COOKIE
        };
        res.json(branding);
    } catch (error) {
        console.error('Error getting branding:', error);
        res.status(500).json({ error: 'Failed to get branding' });
    }
});

// Update branding (writes to .env)
router.put('/branding', async (req, res) => {
    try {
        const { userName, companyName, logoUrl, profileImageUrl, theme } = req.body;
        const envPath = path.join(__dirname, '..', '..', '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        const setEnv = (key, value) => {
            if (value === undefined || value === null) return;
            const str = String(value).trim();
            const regex = new RegExp(`^${key}=.*$`, 'm');
            const line = `${key}=${str}`;
            if (regex.test(envContent)) envContent = envContent.replace(regex, line);
            else envContent += (envContent ? '\n' : '') + line;
            process.env[key] = str;
        };
        setEnv('APP_USER_NAME', userName);
        setEnv('APP_COMPANY_NAME', companyName);
        setEnv('APP_LOGO_URL', logoUrl);
        setEnv('APP_PROFILE_IMAGE_URL', profileImageUrl);
        if (theme && ['default', 'blue', 'green', 'violet'].includes(theme)) setEnv('APP_THEME', theme);
        fs.writeFileSync(envPath, envContent.trim() + '\n');
        res.json({ success: true, message: 'Branding updated. Refresh the app to see changes.' });
    } catch (error) {
        console.error('Error updating branding:', error);
        res.status(500).json({ error: 'Failed to update branding' });
    }
});

// Get current settings (masked sensitive data)
router.get('/', async (req, res) => {
    try {
        const linkedinProfileUrl = process.env.LINKEDIN_PROFILE_URL || '';

        // Enrich profile data if URL is provided
        let enrichedProfile = null;
        if (linkedinProfileUrl) {
            enrichedProfile = await profileEnrichmentService.enrichProfileFromUrl(linkedinProfileUrl);
        }

        const settings = {
            phantombuster: {
                apiKey: process.env.PHANTOMBUSTER_API_KEY ? maskKey(process.env.PHANTOMBUSTER_API_KEY) : '',
                networkBoosterPhantomId: process.env.NETWORK_BOOSTER_PHANTOM_ID || '',
                // LinkedIn Search Export phantom (canonical: SEARCH_EXPORT_PHANTOM_ID)
                searchExportPhantomId: process.env.SEARCH_EXPORT_PHANTOM_ID || process.env.SEARCH_LEADS_PHANTOM_ID || '',
                profileScraperPhantomId: process.env.PROFILE_SCRAPER_PHANTOM_ID || '',
                linkedinSessionCookie: process.env.LINKEDIN_SESSION_COOKIE ? maskKey(process.env.LINKEDIN_SESSION_COOKIE) : ''
            },
            ai: {
                openaiApiKey: process.env.OPENAI_API_KEY ? maskKey(process.env.OPENAI_API_KEY) : '',
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
            },
            email: {
                provider: process.env.EMAIL_PROVIDER || 'sendgrid',
                sendgridApiKey: process.env.SENDGRID_API_KEY ? maskKey(process.env.SENDGRID_API_KEY) : '',
                senderEmail: process.env.SENDER_EMAIL || '',
                awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ? maskKey(process.env.AWS_ACCESS_KEY_ID) : '',
                awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? maskKey(process.env.AWS_SECRET_ACCESS_KEY) : '',
                awsRegion: process.env.AWS_REGION || 'us-east-1'
            },
            safety: {
                maxDailyInvites: parseInt(process.env.MAX_DAILY_INVITES) || 20,
                emailFailoverDelay: parseInt(process.env.EMAIL_FAILOVER_DELAY) || 7
            },
            preferences: {
                linkedinProfileUrl,
                preferredCompanyKeywords: process.env.PREFERRED_COMPANY_KEYWORDS || '',
                // Include enriched profile data
                industry: enrichedProfile?.industry || '',
                title: enrichedProfile?.title || '',
                company: enrichedProfile?.company || '',
                metadata: enrichedProfile?.metadata || []
            }
        };

        res.json(settings);
    } catch (error) {
        console.error('Error getting settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Update settings
router.put('/', async (req, res) => {
    try {
        const { phantombuster, ai, email, safety, preferences } = req.body;

        // Read current .env file
        const envPath = path.join(__dirname, '..', '..', '.env');
        let envContent = '';

        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        // Update environment variables
        const updates = {
            // PhantomBuster
            PHANTOMBUSTER_API_KEY: phantombuster?.apiKey,
            NETWORK_BOOSTER_PHANTOM_ID: phantombuster?.networkBoosterPhantomId,
            // LinkedIn Search Export phantom (canonical env var)
            SEARCH_EXPORT_PHANTOM_ID: phantombuster?.searchExportPhantomId ?? phantombuster?.searchLeadsPhantomId,
            PROFILE_SCRAPER_PHANTOM_ID: phantombuster?.profileScraperPhantomId,
            LINKEDIN_SESSION_COOKIE: phantombuster?.linkedinSessionCookie,

            // AI
            OPENAI_API_KEY: ai?.openaiApiKey,
            OPENAI_MODEL: ai?.model,

            // Email
            EMAIL_PROVIDER: email?.provider,
            SENDGRID_API_KEY: email?.sendgridApiKey,
            SENDER_EMAIL: email?.senderEmail,
            AWS_ACCESS_KEY_ID: email?.awsAccessKeyId,
            AWS_SECRET_ACCESS_KEY: email?.awsSecretAccessKey,
            AWS_REGION: email?.awsRegion,

            // Safety
            MAX_DAILY_INVITES: safety?.maxDailyInvites,
            EMAIL_FAILOVER_DELAY: safety?.emailFailoverDelay,

            // Preferences
            LINKEDIN_PROFILE_URL: preferences?.linkedinProfileUrl,
            PREFERRED_COMPANY_KEYWORDS: preferences?.preferredCompanyKeywords
        };

        // Update .env file
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined && value !== null && value !== '') {
                // Skip if value is masked (contains ***)
                if (typeof value === 'string' && value.includes('***')) {
                    continue;
                }

                const regex = new RegExp(`^${key}=.*$`, 'm');
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }

                // Also update process.env for immediate effect
                process.env[key] = value.toString();
            }
        }

        // Write updated .env file
        fs.writeFileSync(envPath, envContent.trim() + '\n');

        // 🆕 Re-initialize contact scraper with new cookie if updated
        if (phantombuster?.linkedinSessionCookie) {
            console.log('🔄 Re-initializing contact scraper with updated session cookie...');
            // Don't await this to keep response fast, but handle errors
            contactScraperService.initialize(phantombuster.linkedinSessionCookie).catch(err => {
                console.error('⚠️ Failed to re-initialize contact scraper:', err.message);
            });
        }

        res.json({
            success: true,
            message: 'Settings updated successfully. Restart server for all changes to take effect.'
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Test PhantomBuster connection
router.post('/test/phantombuster', async (req, res) => {
    try {
        const apiKey = process.env.PHANTOMBUSTER_API_KEY;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'PhantomBuster API key not configured'
            });
        }

        const response = await fetch('https://api.phantombuster.com/api/v2/agent/fetch-all', {
            headers: {
                'X-Phantombuster-Key': apiKey
            }
        });

        if (response.ok) {
            const data = await response.json();
            res.json({
                success: true,
                message: `Connected! Found ${data.length} phantoms.`,
                phantomCount: data.length
            });
        } else {
            res.json({
                success: false,
                message: 'Invalid API key or connection failed'
            });
        }
    } catch (error) {
        console.error('PhantomBuster test failed:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
});

// Test OpenAI connection
router.post('/test/openai', async (req, res) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'OpenAI API key not configured'
            });
        }

        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (response.ok) {
            res.json({
                success: true,
                message: 'OpenAI API key is valid!'
            });
        } else {
            res.json({
                success: false,
                message: 'Invalid API key'
            });
        }
    } catch (error) {
        console.error('OpenAI test failed:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
});

// Test Email connection
router.post('/test/email', async (req, res) => {
    try {
        const provider = process.env.EMAIL_PROVIDER || 'sendgrid';

        if (provider === 'sendgrid') {
            const apiKey = process.env.SENDGRID_API_KEY;
            if (!apiKey) {
                return res.json({
                    success: false,
                    message: 'SendGrid API key not configured'
                });
            }

            const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (response.ok) {
                res.json({
                    success: true,
                    message: 'SendGrid API key is valid!'
                });
            } else {
                res.json({
                    success: false,
                    message: 'Invalid SendGrid API key'
                });
            }
        } else {
            res.json({
                success: true,
                message: 'AWS SES configuration saved (test not implemented)'
            });
        }
    } catch (error) {
        console.error('Email test failed:', error);
        res.json({
            success: false,
            message: error.message
        });
    }
});

// Helper function to mask sensitive keys
function maskKey(key) {
    if (!key || key.length < 8) return '***';
    return key.substring(0, 4) + '***' + key.substring(key.length - 4);
}

export default router;
