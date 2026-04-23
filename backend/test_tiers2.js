import pool from "./src/db.js";

async function main() {
  try {
    const r = await pool.query("SELECT COALESCE(manual_tier, preference_tier, 'tertiary') as tier, COUNT(*) as cnt FROM leads GROUP BY COALESCE(manual_tier, preference_tier, 'tertiary')");
    console.log(r.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
main();
