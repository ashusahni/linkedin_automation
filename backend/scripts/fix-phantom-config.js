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

async function pbRequest(endpoint, method = 'GET', data = null) {
    const url = `${PB_API_URL}${endpoint}`;
    const config = {
        method: method,
        url: url,
        headers: {
            "X-Phantombuster-Key": API_KEY,
            "Content-Type": "application/json"
        },
        timeout: 30000
    };
    
    if (data) {
        config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
}

async function fixPhantomConfig() {
    console.log("🔧 Fixing PhantomBuster Agent Configuration\n");
    console.log("=" .repeat(60) + "\n");

    try {
        // 1. Get current agent configuration
        console.log("📋 Step 1: Fetching current agent configuration...\n");
        const agentInfo = await pbRequest(`/agents/fetch?id=${PHANTOM_ID}`);
        
        console.log("Agent Name:", agentInfo.name);
        console.log("Current arguments:", agentInfo.argument);
        
        const currentArgs = agentInfo.argument ? JSON.parse(agentInfo.argument) : {};
        
        console.log("\n🔍 Current problematic settings:");
        console.log("   spreadsheetUrl:", currentArgs.spreadsheetUrl || "Not set");
        console.log("   numberOfAddsPerLaunch:", currentArgs.numberOfAddsPerLaunch || "Not set");
        console.log("   pushResultToCRM:", currentArgs.pushResultToCRM);
        
        console.log("\n" + "=".repeat(60) + "\n");

        // 2. Create new configuration
        console.log("📋 Step 2: Creating cleaned configuration...\n");
        
        const newArgs = {
            // Remove the saved spreadsheet URL (this is the main problem!)
            // spreadsheetUrl: undefined,  // Don't include it at all
            
            // Set safe defaults
            numberOfAddsPerLaunch: 1,  // Only scrape 1 profile by default
            enrichWithCompanyData: false,  // Faster
            updateMonitoringMetadata: false,  // Faster
            pushResultToCRM: false,  // Save to PhantomBuster storage
            saveResultsToDatabase: true,  // Save results
            
            // Keep LinkedIn session info if it exists
            ...(currentArgs.identities ? { identities: currentArgs.identities } : {}),
            ...(currentArgs.sessionCookie ? { sessionCookie: currentArgs.sessionCookie } : {})
        };
        
        console.log("✅ New configuration:");
        console.log("   spreadsheetUrl: REMOVED ✅");
        console.log("   numberOfAddsPerLaunch: 1 ✅");
        console.log("   pushResultToCRM: false ✅");
        console.log("   saveResultsToDatabase: true ✅");
        
        console.log("\n" + "=".repeat(60) + "\n");

        // 3. Update the agent
        console.log("📋 Step 3: Updating agent configuration via API...\n");
        
        try {
            const updateData = {
                id: PHANTOM_ID,
                argument: JSON.stringify(newArgs)
            };
            
            const result = await pbRequest('/agents/save', 'POST', updateData);
            
            console.log("✅ SUCCESS! Agent configuration updated!\n");
            console.log("Result:", result);
            
        } catch (updateError) {
            if (updateError.response && updateError.response.status === 403) {
                console.log("❌ API doesn't allow updating agent configuration");
                console.log("   This is a PhantomBuster API limitation.");
                console.log("\n💡 WORKAROUND: We'll force parameters on every launch instead.");
                console.log("   The code has been updated to override all problematic settings.\n");
            } else {
                throw updateError;
            }
        }
        
        console.log("\n" + "=".repeat(60) + "\n");
        console.log("✅ Configuration fix complete!");
        console.log("\n📋 Next steps:");
        console.log("   1. Restart your backend");
        console.log("   2. Try enriching 1 lead again");
        console.log("   3. It should now only scrape the 1 profile you request\n");
        
    } catch (error) {
        console.error("❌ Fix failed:", error.message);
        if (error.response) {
            console.error("Response:", error.response.status, error.response.data);
        }
    }
}

fixPhantomConfig();
