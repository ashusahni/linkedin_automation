import pool from '../db.js';

/**
 * Notification types for CRM activity feed
 * - lead_imported, lead_created, lead_enriched
 * - campaign_launched, campaign_paused, campaign_resumed, campaign_queued
 * - approval_needed, approval_approved, approval_rejected
 * - connection_sent, message_sent, reply_detected
 * - phantom_completed, phantom_failed
 * - automation_completed, automation_failed, daily_limit_reached
 */
export const NotificationService = {
    async create({ type, title, message, data = {} }) {
        try {
            const result = await pool.query(
                `INSERT INTO notifications (type, title, message, data) VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
                [type, title, message || null, JSON.stringify(data)]
            );
            return result.rows[0];
        } catch (err) {
            console.error('NotificationService.create error:', err.message);
            return null;
        }
    },

    async list({ limit = 50, offset = 0, unreadOnly = false } = {}) {
        let query = `SELECT * FROM notifications WHERE 1=1`;
        const params = [];
        if (unreadOnly) {
            query += ` AND read_at IS NULL`;
        }
        query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
        params.push(Math.min(limit, 100), offset);
        const result = await pool.query(query, params);
        return result.rows;
    },

    async getUnreadCount() {
        const result = await pool.query(
            `SELECT COUNT(*)::int as count FROM notifications WHERE read_at IS NULL`
        );
        return result.rows[0]?.count ?? 0;
    },

    async markAsRead(id) {
        await pool.query(`UPDATE notifications SET read_at = NOW() WHERE id = $1`, [id]);
    },

    async markAllAsRead() {
        await pool.query(`UPDATE notifications SET read_at = NOW() WHERE read_at IS NULL`);
    },
};

export default NotificationService;
