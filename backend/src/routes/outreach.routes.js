import { Router } from 'express';
import {
    sendBulkEmailOutreach,
    sendBulkSMSOutreach,
    getOutreachStats
} from '../controllers/outreach.controller.js';

const router = Router();

// Bulk outreach routes
router.post('/campaigns/:id/outreach/email', sendBulkEmailOutreach);
router.post('/campaigns/:id/outreach/sms', sendBulkSMSOutreach);
router.get('/campaigns/:id/outreach/stats', getOutreachStats);

export default router;
