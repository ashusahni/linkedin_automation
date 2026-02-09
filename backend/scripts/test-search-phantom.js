import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import phantomService from "../src/services/phantombuster.service.js";

async function testSearchAgent() {
    try {
        console.log("🧪 Testing Search Leads Phantom (Agent #2)...");
        console.log("🔑 API Key loaded:", process.env.PHANTOMBUSTER_API_KEY ? "✅ YES" : "❌ NO");
        console.log("🔑 API Key (first 10 chars):", process.env.PHANTOMBUSTER_API_KEY?.substring(0, 10) || "MISSING");

        // Test with a specific query and low limit
        const query = "Software Engineer at Google";
        const limit = 5;

        const result = await phantomService.searchLeads(query, limit);

        console.log("✅ Search Phantom Result Summary:");
        console.log(`   - Success: ${result.success}`);
        console.log(`   - Records: ${result.totalRecords}`);
        console.log(`   - Result URL: ${result.resultUrl}`);

        if (result.data && result.data.length > 0) {
            console.log("📝 Sample Lead:", result.data[0].fullName || result.data[0].name);
        }

    } catch (error) {
        console.error("❌ Search Test Failed:", error.message);
    }
}

testSearchAgent();
