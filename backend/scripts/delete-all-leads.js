import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../src/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is loaded
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function deleteAllLeads() {
  console.log("🧹 Deleting ALL leads and related data from database...\n");

  try {
    // Explicitly clear dependent tables first (same logic as deleteAllLeads controller)
    console.log("🔸 Deleting from lead_enrichment...");
    await pool.query("DELETE FROM lead_enrichment");

    console.log("🔸 Deleting from campaign_leads...");
    await pool.query("DELETE FROM campaign_leads");

    console.log("🔸 Deleting from leads...");
    const result = await pool.query("DELETE FROM leads");
    const deletedCount = result.rowCount || 0;

    console.log(`\n✅ Deleted ${deletedCount} leads from 'leads' table.`);

    try {
      console.log("🔸 Deleting import logs...");
      await pool.query("DELETE FROM import_logs");
    } catch (err) {
      console.warn("⚠️ Could not delete from import_logs (table may not exist):", err.message);
    }

    console.log("\n✅ All lead-related data cleared successfully.");
  } catch (err) {
    console.error("❌ Error while deleting leads:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deleteAllLeads();

