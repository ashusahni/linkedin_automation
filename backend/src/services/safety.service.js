import pool from '../db.js';

class SafetyService {
    // Current limits (Should eventually be moved to a settings table in DB)
    static LIMITS = {
        'connection_request': 20,
        'message': 50,
        'email': 100
    };

    /**
     * Checks if we can perform an action based on 24-hour history
     * @param {string} actionType - 'connection_request', 'message', etc.
     * @returns {Promise<boolean>} - True if safe to proceed
     */
    static async isSafeToProceed(actionType) {
        try {
            const limit = this.LIMITS[actionType] || 20;

            // Count actions of this type in the last 24 hours
            const result = await pool.query(`
                SELECT COUNT(*) as count 
                FROM automation_logs 
                WHERE event_type = 'phantom_launched' 
                AND (details->>'step_type') = $1
                AND created_at > NOW() - INTERVAL '24 hours'
            `, [actionType]);

            const count = parseInt(result.rows[0].count);

            console.log(`🛡️ Safety Check [${actionType}]: ${count}/${limit} used today.`);

            return count < limit;
        } catch (error) {
            console.error("❌ Safety Service Error:", error.message);
            return false; // Error? Better to stay safe and say NO.
        }
    }

    /**
     * Logs a successful launch so we can track it
     */
    static async logAction(actionType, details = {}) {
        await pool.query(`
            INSERT INTO automation_logs (event_type, details)
            VALUES ($1, $2)
        `, ['phantom_launched', JSON.stringify({ step_type: actionType, ...details })]);
    }
}

export default SafetyService;
