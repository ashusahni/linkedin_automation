import axios from 'axios';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Hunter.io Service
 * Handles email discovery and verification using Hunter.io API.
 */
class HunterService {
    constructor() {
        this.apiKey = config.hunter.apiKey;
        this.baseUrl = 'https://api.hunter.io/v2';
        this.lastCallTime = 0;
        this.minInterval = 1000; // 1 second between calls
    }

    /**
     * Enforce rate limiting (1 request per second)
     */
    async _throttle() {
        const now = Date.now();
        const elapsed = now - this.lastCallTime;
        if (elapsed < this.minInterval) {
            const wait = this.minInterval - elapsed;
            await new Promise(resolve => setTimeout(resolve, wait));
        }
        this.lastCallTime = Date.now();
    }

    /**
     * Handle Hunter API errors
     */
    _handleError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const message = data.errors?.[0]?.details || data.errors?.[0]?.message || 'Unknown Hunter API error';

            switch (status) {
                case 401:
                    return { success: false, data: null, error: 'Invalid Hunter API key', status: 401 };
                case 429:
                    return { success: false, data: null, error: 'Hunter rate limit exceeded', status: 429 };
                case 422:
                    return { success: false, data: null, error: `Invalid parameters: ${message}`, status: 422 };
                default:
                    return { success: false, data: null, error: message, status };
            }
        }
        return { success: false, data: null, error: error.message || 'Network error' };
    }

    /**
     * Find email for a given name and domain
     */
    async findEmail(firstName, lastName, domain) {
        if (!this.apiKey) {
            return { success: false, data: null, error: 'HUNTER_API_KEY not configured' };
        }

        if (!firstName || !lastName || !domain) {
            return { success: false, data: null, error: 'Missing required parameters (firstName, lastName, domain)' };
        }

        try {
            await this._throttle();

            // Clean names (remove trailing dots, etc.)
            const cleanFirst = firstName.trim().replace(/\.$/, '');
            const cleanLast = lastName.trim().replace(/\.$/, '');

            logger.info(`🔍 Hunter: Finding email for ${cleanFirst} ${cleanLast} @ ${domain}`);

            const response = await axios.get(`${this.baseUrl}/email-finder`, {
                params: {
                    first_name: cleanFirst,
                    last_name: cleanLast,
                    domain: domain,
                    api_key: this.apiKey
                }
            });

            return {
                success: true,
                data: response.data.data,
                error: null
            };
        } catch (error) {
            const hunterError = error.response?.data?.errors?.[0]?.message || error.message;
            logger.error(`❌ Hunter Finder Error: ${hunterError}`);
            return this._handleError(error);
        }
    }

    /**
     * Verify an email address
     */
    async verifyEmail(email) {
        if (!this.apiKey) {
            return { success: false, data: null, error: 'HUNTER_API_KEY not configured' };
        }

        if (!email) {
            return { success: false, data: null, error: 'Missing email parameter' };
        }

        try {
            await this._throttle();
            logger.info(`🔍 Hunter: Verifying email ${email}`);

            const response = await axios.get(`${this.baseUrl}/email-verifier`, {
                params: {
                    email: email,
                    api_key: this.apiKey
                }
            });

            return {
                success: true,
                data: response.data.data,
                error: null
            };
        } catch (error) {
            const hunterError = error.response?.data?.errors?.[0]?.message || error.message;
            logger.error(`❌ Hunter Verifier Error: ${hunterError}`);
            return this._handleError(error);
        }
    }
}

const hunterService = new HunterService();
export default hunterService;
