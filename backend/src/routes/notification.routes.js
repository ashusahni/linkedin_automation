import express from 'express';
import { NotificationService } from '../services/notification.service.js';

const router = express.Router();

// GET /api/notifications - list notifications
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0, unreadOnly } = req.query;
        const rows = await NotificationService.list({
            limit: parseInt(limit, 10) || 50,
            offset: parseInt(offset, 10) || 0,
            unreadOnly: unreadOnly === 'true',
        });
        return res.json(rows);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// POST /api/notifications/mark-all-read - must be before :id
router.post('/mark-all-read', async (req, res) => {
    try {
        await NotificationService.markAllAsRead();
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
    try {
        const count = await NotificationService.getUnreadCount();
        return res.json({ count });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// PATCH /api/notifications/:id/read - mark one as read
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        await NotificationService.markAsRead(id);
        return res.json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
