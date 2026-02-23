/**
 * preferences.controller.js
 *
 * Handles GET/PUT for preference settings and the toggle endpoint.
 * Also exposes a manual "recalculate" endpoint.
 *
 * Endpoints (to be added to settings.routes.js or a new preferences.routes.js):
 *   GET  /api/preferences          – load current preferences
 *   PUT  /api/preferences          – save preferences (triggers rescore)
 *   POST /api/preferences/activate – toggle preference_active
 *   POST /api/preferences/rescore  – manually trigger full rescore
 */

import {
    loadPreferences,
    savePreferences,
    recalculateAllScores,
} from '../services/preferenceScoring.service.js';

// GET /api/preferences
export async function getPreferences(req, res) {
    try {
        const prefs = await loadPreferences();
        return res.json(prefs || {
            linkedin_profile_url: '',
            preferred_companies: '',
            preferred_industries: [],
            preferred_titles: [],
            preferred_locations: '',
            niche_keywords: '',
            profile_meta: {},
            primary_threshold: 120,
            secondary_threshold: 60,
            auto_approval_threshold: 150,
            preference_active: false,
        });
    } catch (err) {
        console.error('[preferences] GET error:', err);
        res.status(500).json({ error: err.message });
    }
}

// PUT /api/preferences
export async function updatePreferences(req, res) {
    try {
        const {
            linkedin_profile_url,
            preferred_companies,
            preferred_industries,
            preferred_titles,
            preferred_locations,
            niche_keywords,
            profile_meta,
            primary_threshold,
            secondary_threshold,
            auto_approval_threshold,
            preference_active,
        } = req.body;

        // Also sync LINKEDIN_PROFILE_URL and PREFERRED_COMPANY_KEYWORDS to env
        // so the old matchesUserNiche logic keeps working as well
        if (linkedin_profile_url) {
            process.env.LINKEDIN_PROFILE_URL = linkedin_profile_url;
        }
        if (preferred_companies) {
            process.env.PREFERRED_COMPANY_KEYWORDS = preferred_companies;
        }

        await savePreferences({
            linkedin_profile_url,
            preferred_companies,
            preferred_industries,
            preferred_titles,
            preferred_locations,
            niche_keywords,
            profile_meta,
            primary_threshold,
            secondary_threshold,
            auto_approval_threshold,
            preference_active,
        });

        // Rescore asynchronously — don't block the HTTP response
        recalculateAllScores().catch(err =>
            console.error('[preferences] Background rescore error:', err)
        );

        return res.json({
            success: true,
            message: 'Preferences saved. Rescoring leads in background…',
        });
    } catch (err) {
        console.error('[preferences] PUT error:', err);
        res.status(500).json({ error: err.message });
    }
}

// POST /api/preferences/activate
export async function togglePreferenceActive(req, res) {
    try {
        const { active } = req.body; // boolean
        const prefs = await loadPreferences();
        if (!prefs) return res.status(404).json({ error: 'Preferences not configured' });

        await savePreferences({ ...prefs, preference_active: !!active });

        // Rescoring is needed when activating so leads get proper tier assignments
        if (active) {
            recalculateAllScores().catch(err =>
                console.error('[preferences] Background rescore (toggle) error:', err)
            );
        }

        return res.json({
            success: true,
            preference_active: !!active,
            message: active ? 'Preferences activated. Rescoring leads…' : 'Preferences deactivated.',
        });
    } catch (err) {
        console.error('[preferences] toggle error:', err);
        res.status(500).json({ error: err.message });
    }
}

// POST /api/preferences/rescore
export async function rescoreLeads(req, res) {
    try {
        // Fire off and return immediately
        res.json({ success: true, message: 'Rescore started in background. This may take a moment.' });
        await recalculateAllScores();
    } catch (err) {
        console.error('[preferences] rescore error:', err);
    }
}
