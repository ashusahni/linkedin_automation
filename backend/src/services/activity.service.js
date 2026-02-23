import { pool } from "../db.js";

class ActivityService {
    /**
     * Log a new activity for a lead
     * @param {number} leadId 
     * @param {string} type - 'CONNECTION_REQUEST', 'MESSAGE', 'STATUS_CHANGE', 'NOTE'
     * @param {string} description 
     * @param {object} metadata - Optional JSON data
     */
    async logActivity(leadId, type, description, metadata = {}) {
        try {
            const query = `
        INSERT INTO lead_activities (lead_id, type, description, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
            const result = await pool.query(query, [leadId, type, description, metadata]);
            return result.rows[0];
        } catch (error) {
            console.error("❌ Failed to log activity:", error.message);
            // We don't throw here to prevent breaking the main flow if logging fails
            return null;
        }
    }

    /**
     * Get all activities for a lead
     * @param {number} leadId 
     */
    async getActivities(leadId) {
        try {
            const query = `
        SELECT * FROM lead_activities 
        WHERE lead_id = $1 
        ORDER BY created_at DESC
      `;
            const result = await pool.query(query, [leadId]);
            return result.rows;
        } catch (error) {
            console.error("❌ Failed to get activities:", error.message);
            throw error;
        }
    }
}

export default new ActivityService();
