import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PB_API_URL = "https://api.phantombuster.com/api/v2";
const API_KEY = process.env.PHANTOMBUSTER_API_KEY;
const PHANTOM_ID = process.env.PROFILE_SCRAPER_PHANTOM_ID;

async function pbRequest(endpoint) {
    const url = `${PB_API_URL}${endpoint}`;
    const response = await axios({
        method: 'GET',
        url: url,
        headers: {
            "X-Phantombuster-Key": API_KEY,
            "Content-Type": "application/json"
        },
        timeout: 30000
    });
    return response.data;
}

async function diagnose() {
    console.log("🔍 Diagnosing PhantomBuster Over-Scraping Issue\n");
    console.log("=" .repeat(60) + "\n");

    try {
        // 1. Check agent configuration
        console.log("📋 Step 1: Checking agent configuration...\n");
        const agentInfo = await pbRequest(`/agents/fetch?id=${PHANTOM_ID}`);
        
        console.log("Agent Name:", agentInfo.name);
        console.log("Script ID:", agentInfo.scriptId);
        
        if (agentInfo.argument) {
            console.log("\n📝 Agent's DEFAULT arguments:");
            const args = JSON.parse(agentInfo.argument);
            console.log("   numberOfAddsPerLaunch:", args.numberOfAddsPerLaunch || "Not set");
            console.log("   spreadsheetUrl:", args.spreadsheetUrl ? "SET (using saved spreadsheet!)" : "Not set");
            console.log("   enrichWithCompanyData:", args.enrichWithCompanyData);
            console.log("   pushResultToCRM:", args.pushResultToCRM);
            
            if (args.spreadsheetUrl) {
                console.log("\n   ⚠️  WARNING: Agent has a saved spreadsheetUrl!");
                console.log("      This means it might ignore the URL you pass and use this instead:");
                console.log("      " + args.spreadsheetUrl);
            }
            
            if (args.numberOfAddsPerLaunch > 10) {
                console.log("\n   ⚠️  WARNING: numberOfAddsPerLaunch is set to", args.numberOfAddsPerLaunch);
                console.log("      This will cause it to scrape many profiles!");
            }
        }
        
        console.log("\n" + "=".repeat(60) + "\n");

        // 2. Check last execution
        console.log("📋 Step 2: Checking last execution...\n");
        const containers = await pbRequest(`/containers/fetch-all?agentId=${PHANTOM_ID}&limit=1`);
        
        if (containers && containers.containers && containers.containers.length > 0) {
            const lastContainer = containers.containers[0];
            console.log("Last Container ID:", lastContainer.id);
            console.log("Status:", lastContainer.status);
            console.log("Exit Code:", lastContainer.exitCode);
            
            // Get output to see what it actually did
            console.log("\n📋 Checking what the agent actually scraped...\n");
            const containerOutput = await pbRequest(`/containers/fetch-output?id=${lastContainer.id}`);
            
            if (containerOutput.output) {
                const output = containerOutput.output;
                
                // Look for clues about what it scraped
                const profileCount = (output.match(/profile/gi) || []).length;
                const connectionCount = (output.match(/connection/gi) || []).length;
                
                console.log("Mentions of 'profile':", profileCount);
                console.log("Mentions of 'connection':", connectionCount);
                
                // Look for spreadsheet references
                if (output.includes("spreadsheet") || output.includes("database")) {
                    console.log("\n⚠️  Agent mentioned 'spreadsheet' or 'database' in logs!");
                    console.log("   It might be reading from a saved source.");
                }
                
                // Show last few log lines
                const lines = output.split('\n').filter(l => l.trim());
                console.log("\n📋 Last 5 log lines:");
                lines.slice(-5).forEach(line => {
                    console.log("   " + line.substring(0, 100));
                });
            }
        }
        
        console.log("\n" + "=".repeat(60) + "\n");

        // 3. Recommendations
        console.log("💡 Recommendations:\n");
        
        const args = agentInfo.argument ? JSON.parse(agentInfo.argument) : {};
        
        if (args.spreadsheetUrl) {
            console.log("❌ CRITICAL: Agent has a saved spreadsheetUrl");
            console.log("   Solution: Go to PhantomBuster dashboard and remove it");
            console.log("   URL: https://phantombuster.com/agent/" + PHANTOM_ID);
        }
        
        if (args.numberOfAddsPerLaunch && args.numberOfAddsPerLaunch > 10) {
            console.log("⚠️  Agent has numberOfAddsPerLaunch set to", args.numberOfAddsPerLaunch);
            console.log("   Solution: Our code now overrides this, but you can also change it");
            console.log("   in the dashboard to 1 or 5 as default");
        }
        
        if (!args.spreadsheetUrl && (!args.numberOfAddsPerLaunch || args.numberOfAddsPerLaunch <= 10)) {
            console.log("✅ Agent configuration looks good!");
            console.log("   The over-scraping might be due to:");
            console.log("   - Agent reading from its internal database");
            console.log("   - Agent scraping connections of the profile");
            console.log("   - PhantomBuster script behavior");
        }
        
        console.log("\n" + "=".repeat(60) + "\n");
        console.log("✅ Diagnosis complete!");
        
    } catch (error) {
        console.error("❌ Diagnosis failed:", error.message);
        if (error.response) {
            console.error("Response:", error.response.data);
        }
    }
}

diagnose();
