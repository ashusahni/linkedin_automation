import express from 'express';
import { handlePhantomBusterWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// Webhook endpoint for PhantomBuster
// Publicly accessible so PhantomBuster can ping it
router.post('/phantombuster', handlePhantomBusterWebhook);

export default router;
