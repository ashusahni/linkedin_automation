/**
 * One-shot script: populate preference_score & preference_tier on all existing leads
 * using the current preference_settings row.
 *
 * Run with:  node scripts\initial_rescore.mjs
 */
import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { INDUSTRY_KEYWORDS } from '../src/config/industries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pkg;
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres123',
    database: process.env.DB_NAME || 'linkedin_leads',
});

// ── helpers ──
function normalise(str = '') {
    return str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenOverlap(a = '', b = '') {
    const tokA = normalise(a).split(' ').filter(Boolean);
    const tokB = new Set(normalise(b).split(' ').filter(Boolean));
    if (!tokA.length) return 0;
    return tokA.filter(t => tokB.has(t)).length / tokA.length;
}
function is1st(d = '') { const s = normalise(d); return s.includes('1st') || s === '1' || s.includes('first'); }
function is2nd(d = '') { const s = normalise(d); return s.includes('2nd') || s === '2' || s.includes('second'); }

function parseList(str = '') {
    if (!str) return [];
    if (Array.isArray(str)) return str.filter(Boolean);
    return str.split(',').map(s => s.trim()).filter(Boolean);
}

const SENIORITY = {
    executive: ['ceo', 'cto', 'cfo', 'coo', 'founder', 'president', 'vp', 'director', 'head'],
    senior: ['senior', 'lead', 'principal', 'staff', 'manager'],
    mid: ['associate', 'specialist', 'consultant', 'engineer', 'analyst'],
    junior: ['junior', 'entry', 'intern', 'trainee', 'graduate'],
};
function resolveSeniority(title = '') {
    const t = normalise(title);
    for (const [level, tokens] of Object.entries(SENIORITY))
        if (tokens.some(tk => t.includes(tk))) return level;
    return 'mid';
}
function resolveIndustry(company = '', title = '') {
    const text = normalise(`${company} ${title}`);
    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS))
        if (keywords.some(k => text.includes(normalise(k)))) return industry;
    return null;
}

function calculateScore(lead, prefs) {
    if (!prefs) return 0;
    let score = 0;
    const { preferred_companies, preferred_industries, preferred_titles, preferred_locations, niche_keywords, profile_meta = {} } = prefs;
    const leadText = normalise(`${lead.company || ''} ${lead.title || ''}`);

    // Connection weight
    const deg = lead.connection_degree || '';
    if (is1st(deg)) score += 100;
    else if (is2nd(deg)) score += 40;
    else score += 10;

    // Company
    for (const c of parseList(preferred_companies)) {
        const nc = normalise(c); const lc = normalise(lead.company || '');
        if (lc === nc) { score += 60; break; }
        if (lc.includes(nc) || nc.includes(lc)) { score += 40; break; }
        if (tokenOverlap(nc, lc) >= 0.5) { score += 25; break; }
    }

    // Industry
    const allIndustries = [...new Set([
        ...(Array.isArray(preferred_industries) ? preferred_industries : []),
        ...(Array.isArray(profile_meta?.industries) ? profile_meta.industries : []),
    ])];
    if (allIndustries.length > 0) {
        const li = resolveIndustry(lead.company, lead.title);
        if (li) for (const ti of allIndustries) {
            const nli = normalise(li); const nti = normalise(ti);
            if (nli === nti) { score += 50; break; }
            if (nli.includes(nti) || nti.includes(nli)) { score += 35; break; }
            if (tokenOverlap(nti, nli) >= 0.4) { score += 20; break; }
        }
    }

    // Title
    const allTitles = [...new Set([
        ...(Array.isArray(preferred_titles) ? preferred_titles : []),
        ...(Array.isArray(profile_meta?.titles) ? profile_meta.titles : []),
    ])];
    if (allTitles.length > 0) {
        const lt = normalise(lead.title || '');
        const ls = resolveSeniority(lead.title || '');
        for (const tt of allTitles) {
            const ntt = normalise(tt);
            const ov = tokenOverlap(ntt, lt);
            if (ov >= 0.75 || lt === ntt) { score += 50; break; }
            if (ov >= 0.4) { score += 30; break; }
            if (resolveSeniority(tt) === ls) { score += 20; break; }
        }
    }

    // Location
    const lp = normalise(prefs.preferred_locations || '');
    if (lp) {
        const ll = normalise(lead.location || '');
        if (ll === lp || ll.includes(lp)) score += 25;
        else if (lp.split(' ').filter(t => t.length > 2 && ll.split(' ').includes(t)).length > 0) score += 10;
    }

    // Keywords
    const kws = parseList(niche_keywords);
    if (kws.some(kw => leadText.includes(normalise(kw)))) score += 15;

    return Math.round(score);
}

function assignTier(score, degree, prefs) {
    const pt = prefs?.primary_threshold ?? 120;
    const st = prefs?.secondary_threshold ?? 60;
    if (is1st(degree || '')) return 'primary';
    if (score >= pt) return 'primary';
    if (score >= st) return 'secondary';
    return 'tertiary';
}

// ── main ──
const prefRes = await pool.query('SELECT * FROM preference_settings WHERE id = 1');
const prefs = prefRes.rows[0] || null;

if (!prefs) {
    console.log('ℹ️  No preference_settings row found. All leads will remain tertiary with score 0.');
} else {
    console.log('Preferences loaded. Active:', prefs.preference_active);
}

const autoThreshold = prefs?.auto_approval_threshold ?? 150;
const PAGE = 500;
let offset = 0, totalUpdated = 0;

while (true) {
    const { rows } = await pool.query(
        `SELECT id, company, title, location, connection_degree, review_status
       FROM leads ORDER BY id LIMIT $1 OFFSET $2`,
        [PAGE, offset]
    );
    if (rows.length === 0) break;

    for (const lead of rows) {
        const score = calculateScore(lead, prefs);
        const tier = assignTier(score, lead.connection_degree, prefs);
        const autoApprove = prefs?.preference_active && score >= autoThreshold && lead.review_status === 'to_be_reviewed';

        await pool.query(
            `UPDATE leads SET preference_score=$1, preference_tier=$2,
         review_status = CASE WHEN $3 THEN 'approved' ELSE review_status END,
         approved_at   = CASE WHEN $3 AND approved_at IS NULL THEN NOW() ELSE approved_at END,
         updated_at = NOW()
       WHERE id=$4`,
            [score, tier, autoApprove, lead.id]
        );
    }

    totalUpdated += rows.length;
    process.stdout.write(`\rScored ${totalUpdated} leads…`);
    offset += PAGE;
    if (rows.length < PAGE) break;
}

console.log(`\n✅  Initial rescore complete. ${totalUpdated} leads updated.`);
await pool.end();
