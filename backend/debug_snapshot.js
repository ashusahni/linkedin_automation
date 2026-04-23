import fs from 'fs';
import pool from './src/db.js';

async function main() {
  try {
    const r = await pool.query('SELECT profile_meta, preference_tiers, preference_active FROM preference_settings WHERE id = 1');
    fs.writeFileSync('debug_output.json', JSON.stringify(r.rows, null, 2));

    const tiers = await pool.query("SELECT COALESCE(manual_tier, preference_tier, 'tertiary') as tier, industry, count(*) FROM leads GROUP BY 1, 2");
    fs.writeFileSync('debug_tiers.json', JSON.stringify(tiers.rows, null, 2));

    process.exit(0);
  } catch (e) {
    fs.writeFileSync('debug_error.txt', String(e));
    process.exit(1);
  }
}
main();
