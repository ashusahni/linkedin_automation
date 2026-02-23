import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import phantomService from "../src/services/phantombuster.service.js";
import { processPhantomResults } from "../src/services/leadPipeline.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function runPhantomAndImport() {
  const cliPhantomId = process.argv[2];

  // Fallback to env vars if no CLI arg is provided
  const envFallbackId =
    process.env.SEARCH_EXPORT_PHANTOM_ID ||
    process.env.CONNECTIONS_EXPORT_PHANTOM_ID ||
    process.env.PROFILE_SCRAPER_PHANTOM_ID;

  const phantomId = cliPhantomId || envFallbackId;

  if (!phantomId) {
    console.error(
      "❌ No Phantom ID provided.\n" +
        "   Usage: node scripts/run-phantom-import.js <PHANTOM_ID>\n" +
        "   Or set one of: SEARCH_EXPORT_PHANTOM_ID / CONNECTIONS_EXPORT_PHANTOM_ID / PROFILE_SCRAPER_PHANTOM_ID in backend/.env"
    );
    process.exit(1);
  }

  console.log("🧪 Running Phantom and importing leads into database...\n");
  console.log("🔹 Using Phantom ID:", phantomId);
  console.log(
    "🔹 PHANTOMBUSTER_API_KEY present:",
    process.env.PHANTOMBUSTER_API_KEY ? "✅ YES" : "❌ NO"
  );
  console.log(
    "🔹 LINKEDIN_SESSION_COOKIE present:",
    process.env.LINKEDIN_SESSION_COOKIE ? "✅ YES" : "❌ NO"
  );
  console.log("");

  try {
    // 1) Launch the phantom
    const { containerId, uniqueResultBase } = await phantomService.launchPhantom(phantomId);
    console.log("📦 Container launched. ID:", containerId);

    // 2) Wait for completion
    const container = await phantomService.waitForCompletion(
      containerId,
      phantomId
    );
    container.uniqueResultBase = uniqueResultBase;

    // 3) Fetch result data (CSV/JSON/API — prefers JSON when available)
    const data = await phantomService.fetchResultData(container);
    console.log(`\n📊 Phantom returned ${data.length} raw records\n`);

    if (!data || data.length === 0) {
      console.log(
        "⚠️ No data returned from PhantomBuster. Nothing to import into DB."
      );
      process.exit(0);
    }

    // 4) Pipe through the existing lead pipeline to save into DB
    console.log("📝 Saving leads into database via leadPipeline.service...");
    const sourceLabel = `phantom_${phantomId}`;

    const summary = await processPhantomResults(data, {
      source: sourceLabel,
    });

    console.log("\n✅ Import complete!");
    console.log("========================================");
    console.log(`   Source:         ${sourceLabel}`);
    console.log(`   Total records:  ${summary.total}`);
    console.log(`   Saved:          ${summary.saved}`);
    console.log(`   Duplicates:     ${summary.duplicates}`);
    console.log(`   Errors:         ${summary.errors}`);
    console.log(`   CSV export:     ${summary.csvFile}`);
    console.log("========================================\n");

    console.log(
      "💡 You can view these in your DB where `source = '%s'`.",
      sourceLabel
    );
    console.log(
      "   Or via API: GET /api/leads?source=%s (ImportsPage on the frontend).",
      sourceLabel
    );
  } catch (error) {
    console.error("\n❌ Failed to run phantom and import leads.");
    console.error("   Error:", error.message);
    if (error.code) {
      console.error("   Code:", error.code);
    }
    if (error.status) {
      console.error("   HTTP Status:", error.status);
    }
    if (error.details) {
      console.error("   Details:", JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

runPhantomAndImport();

