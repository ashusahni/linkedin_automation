/**
 * One-off script: Re-tier all existing leads (primary / secondary / tertiary by rank).
 * Run from backend folder: node scripts/fix-existing-lead-tiers.js
 * No connection_degree; clears manual_tier so dashboard shows new hierarchy.
 */
import '../src/config/index.js';
import { recalculateAllScores } from '../src/services/preferenceScoring.service.js';

async function main() {
  console.log('Running rescore on all leads...');
  const result = await recalculateAllScores();
  console.log('Done. Updated', result.updated, 'leads. Refresh the dashboard.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
