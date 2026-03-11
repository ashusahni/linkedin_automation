/**
 * Inspect LinkedIn Search Export phantom's argument schema.
 * Run from backend: node scripts/inspect-search-export-args.js
 * Use this to see the EXACT argument key names for "limit" so we can pass the right one from the API.
 */
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import phantomService from '../src/services/phantombuster.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  let id = process.env.SEARCH_EXPORT_PHANTOM_ID || process.env.SEARCH_LEADS_PHANTOM_ID;
  if (!id) {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      const m = env.match(/SEARCH_EXPORT_PHANTOM_ID=(.+)/);
      if (m) process.env.SEARCH_EXPORT_PHANTOM_ID = m[1].trim();
      id = process.env.SEARCH_EXPORT_PHANTOM_ID || process.env.SEARCH_LEADS_PHANTOM_ID;
    }
  }
  if (!id) {
    console.error('❌ Set SEARCH_EXPORT_PHANTOM_ID (or SEARCH_LEADS_PHANTOM_ID) in backend .env');
    process.exit(1);
  }

  console.log('\n🔍 Fetching LinkedIn Search Export phantom:', id);
  try {
    const data = await phantomService.fetchAgent(id);
    if (!data) {
      console.error('❌ Agent not found or fetch failed');
      process.exit(1);
    }

    const agent = data.agent || data;
    const name = agent.name || data.name || 'Unknown';
    console.log('✅ Agent:', name);
    console.log('   ID:', agent.id || id);

    let args = data.argument ?? agent.argument ?? data.arguments ?? agent.arguments;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch {
        console.log('\n📋 Raw argument string:', args?.slice(0, 200));
        process.exit(0);
      }
    }
    if (!args || typeof args !== 'object') {
      console.log('\n📋 No arguments object found');
      process.exit(0);
    }

    const keys = Object.keys(args);
    console.log('\n📋 All argument keys:', keys.join(', '));

    const limitLike = keys.filter(
      (k) =>
        /number|limit|profile|result|launch|scrape|page|max/i.test(k)
    );
    if (limitLike.length > 0) {
      console.log('\n🎯 Keys that may control profile/result limit:');
      limitLike.forEach((k) => {
        const v = args[k];
        console.log(`   ${k}: ${v !== undefined && v !== null ? v : '(not set)'}`);
      });
    }
    console.log('\n💡 Use these key(s) in Phantom launch so the API respects your limit (e.g. 20).');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
