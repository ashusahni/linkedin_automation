/**
 * Check LinkedIn Search Export (PhantomBuster) – are we getting leads?
 *
 * Usage: node backend/src/scripts/check-search-export.js [query] [limit]
 *   query  – optional LinkedIn search query (default: "CEO")
 *   limit  – optional max leads to fetch (default: 5, keep low to save credits)
 *
 * Options:
 *   --check-only   Validate config only (no PhantomBuster launch, no credits used)
 *
 * Examples:
 *   node backend/src/scripts/check-search-export.js
 *   node backend/src/scripts/check-search-export.js "VP Sales" 3
 *   node backend/src/scripts/check-search-export.js --check-only
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SEARCH_EXPORT_PHANTOM_ID =
  process.env.SEARCH_EXPORT_PHANTOM_ID || process.env.SEARCH_LEADS_PHANTOM_ID;

const CHECK_ONLY = process.argv.includes("--check-only");
const ARGS = process.argv.filter((a) => a !== "--check-only");

async function run() {
  console.log("\n🔍 === LinkedIn Search Export Check ===\n");

  // 1. Config check
  if (!process.env.PHANTOMBUSTER_API_KEY) {
    console.error("❌ PHANTOMBUSTER_API_KEY not set in .env");
    process.exit(1);
  }
  if (!SEARCH_EXPORT_PHANTOM_ID) {
    console.error("❌ SEARCH_EXPORT_PHANTOM_ID (or SEARCH_LEADS_PHANTOM_ID) not set in .env");
    process.exit(1);
  }
  if (!process.env.LINKEDIN_SESSION_COOKIE?.trim()) {
    console.warn("⚠️  LINKEDIN_SESSION_COOKIE is empty – PhantomBuster may report 'missing cookies'.");
    console.warn("   Set li_at value in .env or connect LinkedIn in the phantom dashboard.\n");
  }

  if (CHECK_ONLY) {
    const axios = (await import("axios")).default;
    try {
      const res = await axios.get("https://api.phantombuster.com/api/v2/agents/fetch-all", {
        headers: {
          "X-Phantombuster-Key": process.env.PHANTOMBUSTER_API_KEY,
          "Content-Type": "application/json",
        },
      });
      const agent = Array.isArray(res.data) ? res.data.find((a) => a.id === SEARCH_EXPORT_PHANTOM_ID) : null;
      if (agent) {
        console.log(`✅ Phantom "${agent.name}" (${SEARCH_EXPORT_PHANTOM_ID}) found in your account.`);
      } else {
        console.log(`❌ SEARCH_EXPORT_PHANTOM_ID ${SEARCH_EXPORT_PHANTOM_ID} NOT FOUND in your PhantomBuster account.`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`❌ API check failed: ${err.response?.data?.error || err.message}`);
      process.exit(1);
    }
    console.log("✅ Config OK. Run without --check-only to test the full search export.\n");
    process.exit(0);
  }

  const query = ARGS[2] || "CEO";
  const limit = Math.min(parseInt(ARGS[3] || "5", 10) || 5, 50);

  console.log(`📋 Phantom ID: ${SEARCH_EXPORT_PHANTOM_ID}`);
  console.log(`🔍 Query: "${query}"`);
  console.log(`📊 Limit: ${limit} leads (to minimize credits)`);
  console.log("⏳ This may take 2–5 min while PhantomBuster runs...\n");

  try {
    const { default: phantomService } = await import("../services/phantombuster.service.js");

    console.log("🚀 Launching Search Export phantom...");
    const result = await phantomService.searchLeads(query, limit);

    const count = result?.totalRecords ?? (Array.isArray(result?.data) ? result.data.length : 0);

    if (count > 0) {
      console.log("\n✅ SUCCESS: LinkedIn Search Export is working!");
      console.log(`   Leads received: ${count}`);
      if (result?.data?.length > 0) {
        const sample = result.data[0];
        const name =
          sample?.scraperFullName ||
          sample?.fullName ||
          sample?.name ||
          [sample?.firstName, sample?.lastName].filter(Boolean).join(" ") ||
          "?";
        const url =
          sample?.profileUrl ||
          sample?.linkedinProfileUrl ||
          sample?.linkedinUrl ||
          sample?.url ||
          "?";
        console.log(`   Sample lead: ${name} – ${url}`);
      }
      console.log("\n");
      process.exit(0);
    } else {
      console.log("\n⚠️  Search completed but no leads returned.");
      console.log("   Possible causes:");
      console.log("   - LinkedIn search returned no results for this query");
      console.log("   - PhantomBuster couldn't fetch results (check dashboard for this container)");
      console.log("   - Session/cookie expired – refresh LINKEDIN_SESSION_COOKIE in .env\n");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ FAILED:", err.message);
    if (err.code) console.error(`   Code: ${err.code}`);
    if (err.details) console.error("   Details:", JSON.stringify(err.details, null, 2));
    console.log("\n   Check PhantomBuster dashboard for container output and errors.\n");
    process.exit(1);
  }
}

run();
