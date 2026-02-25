import pool from './src/db.js';
import { calculateScore, assignTier, loadPreferences } from './src/services/preferenceScoring.service.js';

async function runDiagnostics() {
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
    console.log("Score distribution histogram:", distRet.rows[0]);

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
      SELECT id, company, title, location, connection_degree, preference_score
      FROM leads
      WHERE connection_degree LIKE '%2nd%' OR connection_degree = '2'
      LIMIT 20
    `);

    for (const lead of leadsRet.rows) {
        let score = 0;
        let c_score = 40; // 2nd degree
        let comp_score = 0;
        let ind_score = 0;
        let t_score = 0;
        let l_score = 0;

        // I will just print what the calculateScore calculates.
        // Wait, I can actually rebuild the score here to debug.
        // But the prompt says "Return full score breakdown: connection_score, company_score, industry_score, title_score, location_score, total_score"
        // Let's modify the service to return breakdown, or I can just copy the logic.
    }

    process.exit(0);
}
runDiagnostics().catch(console.error);
