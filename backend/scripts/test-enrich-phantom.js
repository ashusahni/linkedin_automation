import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import phantomService from "../src/services/phantombuster.service.js";

async function testEnrichAgent() {
    try {
        console.log("🧪 Testing Enrich Profiles Phantom (Agent #3)...");

        // Test with a couple of profile URLs
        const urls = [
            "https://www.linkedin.com/in/williamhgates"
        ];

        const result = await phantomService.enrichProfiles(urls);

        console.log("✅ Enrich Phantom Result Summary:");
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Records: ${result.totalRecords}`);
        console.log(`   - Result URL: ${result.resultUrl}`);

        if (result.data && result.data.length > 0) {
            console.log("📝 Enriched Data Sample:", JSON.stringify(result.data[0], null, 2).substring(0, 200) + "...");
        }

    } catch (error) {
        console.error("❌ Enrich Test Failed:", error.message);
    }
}

testEnrichAgent();
