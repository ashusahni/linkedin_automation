import 'dotenv/config';
import pool from './src/db.js';
import { loadPreferences, calculateScore, assignTier } from './src/services/preferenceScoring.service.js';

console.log("STARTING DIAGNOSTICS");

async function runDiagnostics() {
    try {
        console.log("Querying DB...");
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

        console.log("\nFinished querying. Writing to output.json");
        import('fs').then(fs => {
            fs.writeFileSync('diag_output.json', JSON.stringify({
                dist: distRet.rows[0],
                tiers: tierRet.rows,
                avg: avgScoreRet.rows
            }, null, 2));
        });

    } catch (e) {
        console.error("ERROR OCCURRED:", e);
    } finally {
        process.exit(0);
    }
}
runDiagnostics();
