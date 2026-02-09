// Get LinkedIn account info from session cookie
import axios from 'axios';

const LINKEDIN_SESSION_COOKIE = process.env.LINKEDIN_SESSION_COOKIE;

export async function getLinkedInAccountInfo(req, res) {
    try {
        if (!LINKEDIN_SESSION_COOKIE) {
            return res.json({
                success: false,
                message: 'No LinkedIn session cookie configured'
            });
        }

        // Extract account name from cookie or use a simple identifier
        // LinkedIn cookies don't directly contain the name, so we'll need to either:
        // 1. Store it in settings
        // 2. Make a LinkedIn API call (requires additional setup)
        // 3. Use a placeholder based on cookie

        // For now, let's check if there's a stored LinkedIn account name in settings
        const pool = (await import('../db.js')).default;
        const result = await pool.query(
            'SELECT value FROM settings WHERE key = $1',
            ['linkedin_account_name']
        );

        if (result.rows.length > 0 && result.rows[0].value) {
            return res.json({
                success: true,
                accountName: result.rows[0].value,
                isConfigured: true
            });
        }

        // If not in settings, return a generic indicator
        return res.json({
            success: true,
            accountName: 'LinkedIn Account',
            isConfigured: true,
            cookiePresent: true
        });

    } catch (error) {
        console.error('Error fetching LinkedIn account info:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
