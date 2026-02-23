/**
 * preferenceScoring.service.js
 * 
 * Dynamic, preference-driven lead scoring & tier assignment.
 * Replaces the old PERCENT_RANK (20/30/50 split) approach.
 *
 * Scoring components:
 *   Connection Weight  : 1st=+100, 2nd=+40, 3rd=+10
 *   Company Match      : exact=+60, partial=+40
 *   Industry Match     : exact=+50, subcategory=+35, related=+20
 *   Title Match        : exact=+50, functional=+30, seniority=+20
 *   Location Match     : exact=+25, country/region=+10
 *
 * Tier Thresholds (configurable per row in preference_settings):
 *   Primary   : score >= primary_threshold   (default 120)
 *   Secondary : score >= secondary_threshold (default 60)
 *   Tertiary  : score < secondary_threshold
 *
 * Special override:
 *   1st degree connection ALWAYS → Primary regardless of score.
 */

import pool from '../db.js';
import { INDUSTRY_KEYWORDS } from '../config/industries.js';

// ── helpers ────────────────────────────────────────────────────────────────

/** Normalize a string for comparison (lowercase, no punctuation). */
function normalise(str = '') {
    return str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Token-similarity: how many tokens from `a` appear in `b` (as a ratio). */
function tokenOverlap(a = '', b = '') {
    const tokA = normalise(a).split(' ').filter(Boolean);
    const tokB = new Set(normalise(b).split(' ').filter(Boolean));
    if (!tokA.length) return 0;
    const matches = tokA.filter(t => tokB.has(t)).length;
    return matches / tokA.length;
}

/** Return true if `degree` string indicates 1st-degree connection. */
function is1st(degree = '') {
    const d = normalise(degree);
    return d.includes('1st') || d === '1' || d.includes('first');
}
function is2nd(degree = '') {
    const d = normalise(degree);
    return d.includes('2nd') || d === '2' || d.includes('second');
}

/** Given a lead's company+title text, find the top-level industry via INDUSTRY_KEYWORDS. */
function resolveIndustry(company = '', title = '') {
    const text = normalise(`${company} ${title}`);
    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        if (keywords.some(k => text.includes(normalise(k)))) return industry;
    }
    return null;
}

// Common seniority tokens for title matching
const SENIORITY_TOKENS = {
    executive: ['ceo', 'cto', 'cfo', 'coo', 'founder', 'president', 'vp', 'director', 'head'],
    senior: ['senior', 'lead', 'principal', 'staff', 'manager'],
    mid: ['associate', 'specialist', 'consultant', 'engineer', 'analyst'],
    junior: ['junior', 'entry', 'intern', 'trainee', 'graduate'],
};

function resolveSeniority(title = '') {
    const t = normalise(title);
    for (const [level, tokens] of Object.entries(SENIORITY_TOKENS)) {
        if (tokens.some(tk => t.includes(tk))) return level;
    }
    return 'mid';
}

// ── main scoring logic ─────────────────────────────────────────────────────

/**
 * Calculate a raw preference score for a single lead.
 *
 * @param {object} lead – DB row from `leads`
 * @param {object} prefs – row from `preference_settings`
 * @returns {number} score
 */
export function calculateScore(lead, prefs) {
    // No prefs configured → return 0 (everything stays tertiary)
    if (!prefs) return 0;

    let score = 0;
    const {
        preferred_companies,
        preferred_industries,
        preferred_titles,
        preferred_locations,
        niche_keywords,
        profile_meta = {},
    } = prefs;

    const leadText = normalise(`${lead.company || ''} ${lead.title || ''}`);

    // ── 1. Connection Weight ───────────────────────────────────────────────
    const degree = lead.connection_degree || '';
    if (is1st(degree)) {
        score += 100;
    } else if (is2nd(degree)) {
        score += 40;
    } else {
        score += 10; // 3rd or unknown
    }

    // ── 2. Company Match ──────────────────────────────────────────────────
    const companies = parseList(preferred_companies);
    if (companies.length > 0) {
        const leadCompany = normalise(lead.company || '');
        let companyScore = 0;
        for (const c of companies) {
            const nc = normalise(c);
            if (leadCompany === nc) {
                companyScore = 60; // exact match
                break;
            } else if (leadCompany.includes(nc) || nc.includes(leadCompany)) {
                companyScore = Math.max(companyScore, 40); // partial
            } else {
                const overlap = tokenOverlap(nc, leadCompany);
                if (overlap >= 0.5) companyScore = Math.max(companyScore, 25);
            }
        }
        score += companyScore;
    }

    // ── 3. Industry Match ─────────────────────────────────────────────────
    const industries = Array.isArray(preferred_industries) ? preferred_industries : [];
    const profileIndustries = Array.isArray(profile_meta?.industries) ? profile_meta.industries : [];
    const allTargetIndustries = [...new Set([...industries, ...profileIndustries])];

    if (allTargetIndustries.length > 0) {
        const leadIndustry = resolveIndustry(lead.company, lead.title);
        let industryScore = 0;
        if (leadIndustry) {
            for (const ti of allTargetIndustries) {
                const nti = normalise(ti);
                const nli = normalise(leadIndustry);
                if (nli === nti) {
                    industryScore = 50; // exact
                    break;
                } else if (nli.includes(nti) || nti.includes(nli)) {
                    industryScore = Math.max(industryScore, 35); // subcategory
                } else if (tokenOverlap(nti, nli) >= 0.4) {
                    industryScore = Math.max(industryScore, 20); // related cluster
                }
            }
        }
        score += industryScore;
    }

    // ── 4. Title Match ────────────────────────────────────────────────────
    const titles = Array.isArray(preferred_titles) ? preferred_titles : [];
    const profileTitles = profile_meta?.titles || [];
    const allTargetTitles = [...new Set([...titles, ...profileTitles])];

    if (allTargetTitles.length > 0) {
        const leadTitle = normalise(lead.title || '');
        const leadSeniority = resolveSeniority(lead.title || '');
        let titleScore = 0;
        for (const tt of allTargetTitles) {
            const ntt = normalise(tt);
            const overlap = tokenOverlap(ntt, leadTitle);
            if (overlap >= 0.75 || leadTitle === ntt) {
                titleScore = 50; // very close match
                break;
            } else if (overlap >= 0.4) {
                titleScore = Math.max(titleScore, 30); // functional similarity
            } else {
                // Seniority match only
                const targetSeniority = resolveSeniority(tt);
                if (targetSeniority === leadSeniority) {
                    titleScore = Math.max(titleScore, 20);
                }
            }
        }
        score += titleScore;
    }

    // ── 5. Location Match ─────────────────────────────────────────────────
    const locationPref = normalise(preferred_locations || '');
    if (locationPref) {
        const leadLoc = normalise(lead.location || '');
        if (leadLoc === locationPref || leadLoc.includes(locationPref)) {
            score += 25;
        } else {
            // Country/region match: compare first significant token
            const locTokens = locationPref.split(' ');
            const leadLocTokens = leadLoc.split(' ');
            const commonTokens = locTokens.filter(t => t.length > 2 && leadLocTokens.includes(t));
            if (commonTokens.length > 0) score += 10;
        }
    }

    // ── 6. Niche / Keyword Bonus ──────────────────────────────────────────
    const keywords = parseList(niche_keywords);
    if (keywords.length > 0) {
        for (const kw of keywords) {
            if (leadText.includes(normalise(kw))) {
                score += 15; // additive per keyword, capped below
                break; // one keyword match is enough for bonus
            }
        }
    }

    return Math.round(score);
}

/** Assign a tier string based on score and thresholds. */
export function assignTier(score, degree, prefs) {
    const primaryThreshold = prefs?.primary_threshold ?? 120;
    const secondaryThreshold = prefs?.secondary_threshold ?? 60;

    // 1st degree always → Primary (hard rule)
    if (is1st(degree || '')) return 'primary';

    if (score >= primaryThreshold) return 'primary';
    if (score >= secondaryThreshold) return 'secondary';
    return 'tertiary';
}

// ── database helpers ───────────────────────────────────────────────────────

/** Load the single-row preference_settings row. */
export async function loadPreferences() {
    try {
        const res = await pool.query('SELECT * FROM preference_settings WHERE id = 1');
        return res.rows[0] || null;
    } catch {
        return null;
    }
}

/** Save preference settings (upsert row 1). */
export async function savePreferences(data) {
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
    } = data;

    await pool.query(`
    INSERT INTO preference_settings (
      id,
      linkedin_profile_url, preferred_companies,
      preferred_industries, preferred_titles,
      preferred_locations, niche_keywords,
      profile_meta, primary_threshold, secondary_threshold,
      auto_approval_threshold, preference_active, updated_at
    ) VALUES (
      1, $1, $2, $3::jsonb, $4::jsonb, $5, $6,
      $7::jsonb, $8, $9, $10, $11, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      linkedin_profile_url    = EXCLUDED.linkedin_profile_url,
      preferred_companies     = EXCLUDED.preferred_companies,
      preferred_industries    = EXCLUDED.preferred_industries,
      preferred_titles        = EXCLUDED.preferred_titles,
      preferred_locations     = EXCLUDED.preferred_locations,
      niche_keywords          = EXCLUDED.niche_keywords,
      profile_meta            = EXCLUDED.profile_meta,
      primary_threshold       = EXCLUDED.primary_threshold,
      secondary_threshold     = EXCLUDED.secondary_threshold,
      auto_approval_threshold = EXCLUDED.auto_approval_threshold,
      preference_active       = EXCLUDED.preference_active,
      updated_at              = NOW()
  `, [
        linkedin_profile_url || null,
        preferred_companies || null,
        JSON.stringify(preferred_industries || []),
        JSON.stringify(preferred_titles || []),
        preferred_locations || null,
        niche_keywords || null,
        JSON.stringify(profile_meta || {}),
        primary_threshold ?? 120,
        secondary_threshold ?? 60,
        auto_approval_threshold ?? 150,
        preference_active ?? false,
    ]);
}

/**
 * Recalculate scores for all leads in the DB.
 * Called when preferences are saved or toggled.
 *
 * Does NOT load every lead into memory. Fetches in pages of 500.
 */
export async function recalculateAllScores() {
    const prefs = await loadPreferences();
    if (!prefs) {
        console.warn('[scoring] No preferences found — skipping recalculation');
        return { updated: 0 };
    }

    const autoThreshold = prefs.auto_approval_threshold ?? 150;
    let offset = 0;
    const PAGE = 500;
    let totalUpdated = 0;

    while (true) {
        const { rows } = await pool.query(
            `SELECT id, company, title, location, connection_degree, review_status
         FROM leads
        ORDER BY id
        LIMIT $1 OFFSET $2`,
            [PAGE, offset]
        );
        if (rows.length === 0) break;

        for (const lead of rows) {
            const score = calculateScore(lead, prefs);
            const tier = assignTier(score, lead.connection_degree, prefs);

            // Auto-approve if score meets threshold and not already approved/rejected
            const shouldAutoApprove =
                score >= autoThreshold &&
                lead.review_status === 'to_be_reviewed';

            await pool.query(
                `UPDATE leads
            SET preference_score = $1,
                preference_tier  = $2,
                review_status    = CASE WHEN $3 THEN 'approved' ELSE review_status END,
                approved_at      = CASE WHEN $3 AND approved_at IS NULL THEN NOW() ELSE approved_at END,
                updated_at       = NOW()
          WHERE id = $4`,
                [score, tier, shouldAutoApprove, lead.id]
            );
        }

        totalUpdated += rows.length;
        offset += PAGE;
        if (rows.length < PAGE) break;
    }

    console.log(`[scoring] Recalculated scores for ${totalUpdated} leads`);
    return { updated: totalUpdated };
}

/**
 * Score a single lead object (not yet persisted) and return { score, tier }.
 * Used at ingestion time.
 */
export async function scoreAndClassifyLead(lead) {
    const prefs = await loadPreferences();
    const score = prefs ? calculateScore(lead, prefs) : 0;
    const tier = prefs ? assignTier(score, lead.connection_degree || lead.connectionDegree, prefs) : 'tertiary';
    const autoThreshold = prefs?.auto_approval_threshold ?? 150;
    const shouldAutoApprove = prefs?.preference_active && score >= autoThreshold;
    return { score, tier, shouldAutoApprove };
}

// ── utility ────────────────────────────────────────────────────────────────

function parseList(str = '') {
    if (!str) return [];
    if (Array.isArray(str)) return str.filter(Boolean);
    return str.split(',').map(s => s.trim()).filter(Boolean);
}
