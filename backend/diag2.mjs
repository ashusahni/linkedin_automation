import pool from './src/db.js';
import { loadPreferences, calculateScore, assignTier } from './src/services/preferenceScoring.service.js';

// Re-write calculateScore briefly to output breakdown
function calculateScoreDetailed(lead, prefs) {
    if (!prefs) return { total_score: 0, breakdown: {} };

    let connection_score = 0;
    let company_score = 0;
    let industry_score = 0;
    let title_score = 0;
    let location_score = 0;
    let total_score = 0;

    const {
        preferred_companies, preferred_industries, preferred_titles,
        preferred_locations, niche_keywords, profile_meta = {},
    } = prefs;

    // We can just rely on the existing calculateScore but it doesn't give breakdown.
    // Instead of completely reconstructing, I'll approximate using the identical logic.
    // For brevity of diagnostic, I'll copy the logic but emit breakdown.

    // Quick normalize function
    const normalise = (str = '') => str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const tokenOverlap = (a = '', b = '') => {
        const tokA = normalise(a).split(' ').filter(Boolean);
        const tokB = new Set(normalise(b).split(' ').filter(Boolean));
        if (!tokA.length) return 0;
        const matches = tokA.filter(t => tokB.has(t)).length;
        return matches / tokA.length;
    };

    const parseList = (str = '') => {
        if (!str) return [];
        if (Array.isArray(str)) return str.filter(Boolean);
        return str.split(',').map(s => s.trim()).filter(Boolean);
    };

    const is1st = (d = '') => normalise(d).includes('1st') || d === '1' || normalise(d).includes('first');
    const is2nd = (d = '') => normalise(d).includes('2nd') || d === '2' || normalise(d).includes('second');

    const resolveSeniority = (title = '') => {
        const t = normalise(title);
        if (['ceo', 'cto', 'president', 'vp', 'director', 'head'].some(tk => t.includes(tk))) return 'executive';
        if (['senior', 'lead', 'principal', 'manager'].some(tk => t.includes(tk))) return 'senior';
        if (['junior', 'intern', 'graduate'].some(tk => t.includes(tk))) return 'junior';
        return 'mid';
    };

    // 1. Connection Weight
    const degree = lead.connection_degree || '';
    if (is1st(degree)) connection_score += 100;
    else if (is2nd(degree)) connection_score += 40;
    else connection_score += 10;

    // 2. Company Weight
    const companies = parseList(preferred_companies);
    if (companies.length > 0) {
        let maxC = 0;
        const leadCompany = normalise(lead.company || '');
        for (const c of companies) {
            const nc = normalise(c);
            if (leadCompany === nc) maxC = 60;
            else if (leadCompany.includes(nc) || nc.includes(leadCompany)) maxC = Math.max(maxC, 40);
            else {
                const overlap = tokenOverlap(nc, leadCompany);
                if (overlap >= 0.5) maxC = Math.max(maxC, 25);
            }
        }
        company_score = maxC;
    }

    // Skipped Industry exact mapping for diagnostic brevity, just use 0 
    // Wait, industry score is very important! We will just let calculateScore do the total_score and diff it.

    let total_computed = calculateScore(lead, prefs);

    // Rough Title score
    const titles = Array.isArray(preferred_titles) ? preferred_titles : [];
    const profileTitles = profile_meta?.titles || [];
    const allTargetTitles = [...new Set([...titles, ...profileTitles])];
    if (allTargetTitles.length > 0) {
        const leadTitle = normalise(lead.title || '');
        const leadSeniority = resolveSeniority(lead.title || '');
        for (const tt of allTargetTitles) {
            const ntt = normalise(tt);
            const overlap = tokenOverlap(ntt, leadTitle);
            if (overlap >= 0.75 || leadTitle === ntt) { title_score = 50; break; }
            else if (overlap >= 0.4) title_score = Math.max(title_score, 30);
            else if (resolveSeniority(tt) === leadSeniority) title_score = Math.max(title_score, 20);
        }
    }

    // Location
    const locPref = normalise(preferred_locations || '');
    if (locPref) {
        const lLoc = normalise(lead.location || '');
        if (lLoc === locPref || lLoc.includes(locPref)) location_score = 25;
        else if (locPref.split(' ').filter(t => t.length > 2 && lLoc.split(' ').includes(t)).length > 0) location_score = 10;
    }

    // So industry+niche bonus is what's left
    industry_score = total_computed - (connection_score + company_score + title_score + location_score);

    return {
        connection_score,
        company_score,
        industry_score,
        title_score,
        location_score,
        total_score: total_computed
    };
}


async function runDiagnostics() {
    try {
        console.log("-------------------------------------");
        console.log("1. DIAGNOSTIC REPORT");
        console.log("-------------------------------------");

        // 1. Score distribution histogram
        const distRet = await pool.query(`
          SELECT 
            SUM(CASE WHEN preference_score BETWEEN 0 AND 30 THEN 1 ELSE 0 END) as "0-30",
            SUM(CASE WHEN preference_score BETWEEN 31 AND 60 THEN 1 ELSE 0 END) as "31-60",
            SUM(CASE WHEN preference_score BETWEEN 61 AND 90 THEN 1 ELSE 0 END) as "61-90",
            SUM(CASE WHEN preference_score BETWEEN 91 AND 120 THEN 1 ELSE 0 END) as "91-120",
            SUM(CASE WHEN preference_score > 120 THEN 1 ELSE 0 END) as "120+"
          FROM leads
        `);
        console.log("Score distribution histogram:");
        console.log(distRet.rows[0]);

        // 2. Tier distribution by connection level
        const tierRet = await pool.query(`
          SELECT 
            connection_degree,
            SUM(CASE WHEN preference_tier = 'primary' THEN 1 ELSE 0 END) as primary,
            SUM(CASE WHEN preference_tier = 'secondary' THEN 1 ELSE 0 END) as secondary,
            SUM(CASE WHEN preference_tier = 'tertiary' THEN 1 ELSE 0 END) as tertiary
          FROM leads
          GROUP BY connection_degree
        `);
        console.log("\nTier distribution by connection level:");
        console.table(tierRet.rows);

        // 3. Average score by connection level
        const avgScoreRet = await pool.query(`
          SELECT connection_degree, ROUND(AVG(preference_score), 2) as average_score
          FROM leads
          GROUP BY connection_degree
        `);
        console.log("\nAverage score by connection level:");
        console.table(avgScoreRet.rows);

        // 4. For 20 random 2nd degree leads
        console.log("\nScore breakdown for 20 random 2nd degree leads:");
        const prefs = await loadPreferences();
        const leadsRet = await pool.query(`
          SELECT id, company, title, location, connection_degree, preference_score, preference_tier
          FROM leads
          WHERE connection_degree LIKE '%2nd%' OR connection_degree = '2'
          LIMIT 20
        `);

        const breakdowns = leadsRet.rows.map(lead => {
            const brk = calculateScoreDetailed(lead, prefs);
            return {
                id: lead.id,
                title: lead.title,
                ...brk,
                db_score: lead.preference_score,
                db_tier: lead.preference_tier
            };
        });
        console.table(breakdowns);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
runDiagnostics();
