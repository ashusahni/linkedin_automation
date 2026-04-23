import pool from './src/db.js';
import { scoreAndClassifyLead } from './src/services/preferenceScoring.service.js';
import { matchesUserNiche } from './src/services/lead.service.js';

async function test() {
  const { rows } = await pool.query("SELECT * FROM leads LIMIT 10");
  for (const lead of rows) {
    const niche = await matchesUserNiche(lead);
    const score = await scoreAndClassifyLead(lead);
    console.log(`Lead: ${lead.company} - ${lead.title} | Niche: ${niche} | Tier: ${score.tier}`);
  }
  process.exit(0);
}
test().catch(console.error);
