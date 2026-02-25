/**
 * preferenceScoring.service.js
 * 
 * Dynamic, preference-driven lead scoring & tier assignment.
 * Replaces the old PERCENT_RANK (20/30/50 split) approach.
 *
 * Scoring components:
 *   Connection Weight  : 1st=+100, 2nd=+40, 3rd=+10
 *   Company Match      : exact=+60, partial=+40, token>=50%=+25
 *   Industry Match     : exact=+50, subcategory=+35, related=+20
 *   Title Match        : exact/close=+50, functional>=40%=+30, seniority=+20
 *   Location Match     : exact/contains=+25, country/region token=+10
 *   Niche Keyword Bonus: +15 (one-shot per lead)
 *
 * Tier Assignment Strategy (Option B — intra-group percentile):
 *   1st degree → ALWAYS Primary (hard rule)
 *   2nd degree → ranked by score within the 2nd-degree pool:
 *                 top 30%  → Secondary
 *                 bottom 70% → Tertiary
 *   3rd degree → always Tertiary
 *
 * At batch recalculation:  uses PERCENT_RANK() SQL for precise percentile split.
 * At single-lead ingestion: uses a threshold derived from existing 2nd-degree scores.
 *
 * Score thresholds in preference_settings are still respected as an OVERRIDE
 * if the admin explicitly wants threshold-based tiers instead of percentile tiers.
 * Set preference_active = true AND set both thresholds to 0 to disable threshold overrides
 * (percentile-only mode).
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
    // No prefs configured → return base connection weight so relative ranking still works
    if (!prefs) {
        const degree = lead.connection_degree || '';
        if (is1st(degree)) return 100;
        if (is2nd(degree)) return 40;
        return 10;
    }

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
                score += 15; // additive per keyword, one match is enough
                break;
            }
        }
    }

    return Math.round(score);
}

/**
 * Assign a tier string based on score and degree.
 *
 * Strategy (Option B — intra-group percentile):
 *   - 1st degree: always Primary (hard rule)
 *   - 2nd degree: use percentile threshold from existing 2nd-degree scores
 *                  (top 30% → Secondary, rest → Tertiary)
 *   - 3rd degree: always Tertiary
 *
 * The `peerStats` argument is optional. When provided at batch recalculation
 * time, it contains { p70: number } — the 70th percentile score of all
 * scored 2nd-degree leads in this recalculation batch. During single-lead
 * ingestion the caller may pass null; we fall back to a DB query.
 *
 * @param {number} score
 * @param {string} degree
 * @param {object|null} prefs  – preference_settings row (unused for thresholding now, kept for API compat)
 * @param {number|null} leadId – unused, kept for API compat
 * @param {{ p70: number }|null} peerStats
 */
export function assignTier(score, degree, prefs, leadId = null, peerStats = null) {
    // 1st degree: hard rule → always Primary
    if (is1st(degree || '')) return 'primary';

    // 3rd degree (or unknown): always Tertiary
    if (!is2nd(degree || '')) return 'tertiary';

    // 2nd degree: percentile-based split
    // If peerStats is available (batch mode), use it directly.
    // Otherwise fall back to threshold-only mode (ingestion path — synchronous, no DB call).
    if (peerStats && typeof peerStats.p70 === 'number') {
        // score > p70 means top 30%
        return score > peerStats.p70 ? 'secondary' : 'tertiary';
    }

    // ── Ingestion-time fallback (synchronous, no peerStats available) ──────
    // We compare the new lead's score against a configurable secondary_threshold.
    // Default is 60. When no preferences are configured all 2nd-deg scores = 40,
    // so we lower the effective threshold to 35 to ensure some secondaries exist.
    const secondaryThreshold = prefs?.secondary_threshold ?? 60;
    return score >= secondaryThreshold ? 'secondary' : 'tertiary';
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
 * Recalculate scores for all leads in the DB using the percentile-based tier strategy.
 *
 * Steps:
 *   1. Load all leads, compute raw score for each.
 *   2. Identify 1st, 2nd, and 3rd degree pools.
 *   3. 1st → Primary.
 *   4. 2nd → Sort by score DESC, top 30% → Secondary, rest → Tertiary.
 *   5. 3rd → Tertiary.
 *   6. Persist updates in a single transaction for efficiency.
 *
 * Called when preferences are saved or toggled.
 */
export async function recalculateAllScores() {
    const prefs = await loadPreferences();
    if (!prefs) {
        console.warn('[scoring] No preferences found — skipping recalculation');
        return { updated: 0 };
    }

    const autoThreshold = prefs.auto_approval_threshold ?? 150;

    // ── Pass 1: Fetch and Score every lead ────────────────────────────────
    let offset = 0;
    const PAGE = 1000;
    const allScoredLeads = [];

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
            allScoredLeads.push({
                id: lead.id,
                connection_degree: lead.connection_degree,
                review_status: lead.review_status,
                score: calculateScore(lead, prefs)
            });
        }
        offset += PAGE;
        if (rows.length < PAGE) break;
    }

    if (allScoredLeads.length === 0) return { updated: 0 };

    // ── Pass 2: Assign Tiers based on Pool Ranking ───────────────────────

    // Split into connection pools
    const firstDegree = allScoredLeads.filter(l => is1st(l.connection_degree));
    const secondDegree = allScoredLeads.filter(l => is2nd(l.connection_degree));
    const others = allScoredLeads.filter(l => !is1st(l.connection_degree) && !is2nd(l.connection_degree));

    // 1st Degree -> always Primary
    for (const l of firstDegree) l.tier = 'primary';

    // 2nd Degree -> Ranking (Top 30% -> Secondary)
    // We sort DESC and use index to guarantee the bucket size even if scores are tied
    secondDegree.sort((a, b) => b.score - a.score);
    const secondaryCount = Math.ceil(secondDegree.length * 0.3);
    for (let i = 0; i < secondDegree.length; i++) {
        secondDegree[i].tier = i < secondaryCount ? 'secondary' : 'tertiary';
    }

    // 3rd Degree / Others -> always Tertiary
    for (const l of others) l.tier = 'tertiary';

    // ── Pass 3: Persist Updates in a Transaction ──────────────────────────
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const l of allScoredLeads) {
            const shouldAutoApprove = l.score >= autoThreshold && l.review_status === 'to_be_reviewed';

            await client.query(
                `UPDATE leads
                 SET preference_score = $1,
                     preference_tier  = $2,
                     review_status    = CASE WHEN $3 THEN 'approved' ELSE review_status END,
                     approved_at      = CASE WHEN $3 AND approved_at IS NULL THEN NOW() ELSE approved_at END,
                     updated_at       = NOW()
                 WHERE id = $4`,
                [l.score, l.tier, shouldAutoApprove, l.id]
            );
        }
        await client.query('COMMIT');
        console.log(`[scoring] Recalculated and persisted scores for ${allScoredLeads.length} leads in a single transaction.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[scoring] Failed to persist recalculated scores:', err);
        throw err;
    } finally {
        client.release();
    }

    return { updated: allScoredLeads.length };
}

/**
 * Score a single lead object (not yet persisted) and return { score, tier }.
 * Used at ingestion time.
 *
 * Note: At ingestion, we don't have a batch to percentile-rank against.
 * We use the DB's current 70th-percentile of stored 2nd-degree scores as the cutoff.
 */
export async function scoreAndClassifyLead(lead) {
    const prefs = await loadPreferences();
    const score = prefs ? calculateScore(lead, prefs) : calculateScore(lead, null);

    // Get peer stats from DB for accurate percentile-based tier assignment
    const peerStats = await get2ndDegreePercentile();

    const tier = assignTier(score, lead.connection_degree || lead.connectionDegree, prefs, lead.id, peerStats);
    const autoThreshold = prefs?.auto_approval_threshold ?? 150;
    const shouldAutoApprove = prefs?.preference_active && score >= autoThreshold;
    return { score, tier, shouldAutoApprove };
}

/**
 * Fetch the 70th-percentile score of 2nd-degree leads currently in the DB.
 * Used at ingestion time for single-lead tier assignment.
 *
 * @returns {{ p70: number }}
 */
async function get2ndDegreePercentile() {
    try {
        const { rows } = await pool.query(`
            SELECT PERCENTILE_CONT(0.70) WITHIN GROUP (ORDER BY preference_score) AS p70
            FROM leads
            WHERE connection_degree LIKE '%2nd%' OR connection_degree = '2'
        `);
        const p70 = rows[0]?.p70 ?? 0;
        return { p70: Number(p70) };
    } catch {
        return { p70: 0 };
    }
}

// ── utility ────────────────────────────────────────────────────────────────

function parseList(str = '') {
    if (!str) return [];
    if (Array.isArray(str)) return str.filter(Boolean);
    return str.split(',').map(s => s.trim()).filter(Boolean);
}
