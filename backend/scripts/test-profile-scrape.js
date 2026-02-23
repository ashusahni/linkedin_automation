

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import the phantombuster service
import phantomService from "../src/services/phantombuster.service.js";

async function testProfileScraping() {
    console.log("🧪 Testing Profile Scraping\n");
    console.log("=" .repeat(60) + "\n");

    // Test profile URL: from argv or default
    const testProfileUrl = process.argv[2] || "https://www.linkedin.com/in/williamhgates/";
    
    console.log(`📋 Test Profile: ${testProfileUrl}\n`);

    try {
        console.log("🚀 Starting profile scrape...\n");
        
        const result = await phantomService.scrapeProfile(testProfileUrl);
        
        console.log("\n" + "=".repeat(60));
        console.log("✅ SUCCESS! Profile scraped successfully\n");
        console.log("📊 Result Summary:");
        console.log("   - Container ID:", result.containerId);
        console.log("   - Data received:", result.data ? "Yes" : "No");
        
        if (result.data) {
            console.log("\n📋 Profile Data:");
            const d = result.data;
            const name = d.scraperFullName || d.fullName || d.name || [d.firstName, d.lastName].filter(Boolean).join(" ") || "?";
            const url = d.profileUrl || d.linkedinProfileUrl || d.linkedinUrl || d.url;
            console.log("   - Name:", name);
            console.log("   - Title:", d.linkedinHeadline || d.headline || d.title);
            console.log("   - URL:", url);
            console.log("   - Location:", result.data.location);
            console.log("\n📝 All Fields:");
            console.log(JSON.stringify(result.data, null, 2));
        }
        
        console.log("\n" + "=".repeat(60));
        
    } catch (error) {
        console.log("\n" + "=".repeat(60));
        console.log("❌ FAILED! Profile scraping error\n");
        console.log("Error:", error.message);
        console.log("\n🔍 Troubleshooting Tips:");
        console.log("1. Check PhantomBuster dashboard - did the agent run?");
        console.log("2. Does the agent have results in the Results tab?");
        console.log("3. Is the agent configured to save results to database?");
        console.log("\n📋 Agent Configuration Needed:");
        console.log("   - pushResultToCRM: false");
        console.log("   - saveResultsToDatabase: true");
        console.log("\n" + "=".repeat(60));
        
        if (error.stack) {
            console.log("\n📚 Full Error Stack:");
            console.log(error.stack);
        }
    }
}

testProfileScraping();
