import express from 'express';
import {
    getPreferences,
    updatePreferences,
    togglePreferenceActive,
    rescoreLeads,
} from '../controllers/preferences.controller.js';

const router = express.Router();

router.get('/', getPreferences);
router.put('/', updatePreferences);
router.post('/activate', togglePreferenceActive);
router.post('/rescore', rescoreLeads);

export default router;
