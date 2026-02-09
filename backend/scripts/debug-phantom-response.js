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

async function debugPhantomResponse() {
    try {
        console.log("🔍 Debugging PhantomBuster API Responses\n");
        console.log("API Key:", API_KEY ? `${API_KEY.substring(0, 10)}...` : "NOT SET");
        console.log("Phantom ID:", PHANTOM_ID);
        console.log("\n" + "=".repeat(60) + "\n");

        // 1. Get agent info
        console.log("📋 STEP 1: Fetching agent info...");
        const agentInfo = await pbRequest(`/agents/fetch?id=${PHANTOM_ID}`);
        console.log("Agent Name:", agentInfo.name);
        console.log("Agent Status:", agentInfo.status);
        console.log("Last Launch:", agentInfo.lastLaunchDate);
        console.log("Script ID:", agentInfo.scriptId);
        
        // Check if agent has argument schema
        if (agentInfo.argument) {
            console.log("\n📝 Agent accepts these arguments:");
            console.log(JSON.stringify(agentInfo.argument, null, 2));
        }
        
        console.log("\n" + "=".repeat(60) + "\n");

        // 2. Get agent output
        console.log("📋 STEP 2: Fetching agent output (/agents/fetch-output)...");
        try {
            const agentOutput = await pbRequest(`/agents/fetch-output?id=${PHANTOM_ID}`);
            console.log("\n🔑 Agent Output Response Keys:", Object.keys(agentOutput || {}));
            console.log("\n📦 Full Agent Output Response:");
            console.log(JSON.stringify(agentOutput, null, 2));
            
            if (agentOutput.resultObject) {
                console.log("\n✅ Result Object URL:", agentOutput.resultObject);
                
                // Try to download the result file
                console.log("\n📥 Attempting to download result file...");
                try {
                    const fileResponse = await axios.get(agentOutput.resultObject, {
                        timeout: 30000,
                        responseType: agentOutput.resultObject.endsWith('.csv') ? 'text' : 'json'
                    });
                    
                    if (typeof fileResponse.data === 'string') {
                        // CSV data
                        const lines = fileResponse.data.split('\n');
                        console.log(`✅ Downloaded CSV with ${lines.length} lines`);
                        console.log("First 5 lines:");
                        console.log(lines.slice(0, 5).join('\n'));
                    } else {
                        // JSON data
                        const records = Array.isArray(fileResponse.data) ? fileResponse.data : [fileResponse.data];
                        console.log(`✅ Downloaded JSON with ${records.length} records`);
                        console.log("First record:");
                        console.log(JSON.stringify(records[0], null, 2));
                    }
                } catch (downloadError) {
                    console.log("❌ Failed to download result file:", downloadError.message);
                }
            }
            
            if (agentOutput.output) {
                console.log("\n✅ Output field (type):", typeof agentOutput.output);
                if (typeof agentOutput.output === 'string') {
                    console.log("Output length:", agentOutput.output.length, "chars");
                    console.log("Output preview:", agentOutput.output.substring(0, 500));
                }
            }
            
            if (agentOutput.result) {
                console.log("\n✅ Result field found");
                console.log("Result type:", typeof agentOutput.result);
                if (Array.isArray(agentOutput.result)) {
                    console.log("Result array length:", agentOutput.result.length);
                    if (agentOutput.result.length > 0) {
                        console.log("First result item:");
                        console.log(JSON.stringify(agentOutput.result[0], null, 2));
                    }
                }
            }
        } catch (outputError) {
            console.log("❌ Failed to fetch agent output:", outputError.message);
        }

        console.log("\n" + "=".repeat(60) + "\n");

        // 3. Get last container
        console.log("📋 STEP 3: Fetching last container...");
        const containers = await pbRequest(`/containers/fetch-all?agentId=${PHANTOM_ID}&limit=1`);
        
        if (containers && containers.containers && containers.containers.length > 0) {
            const lastContainer = containers.containers[0];
            console.log("Last Container ID:", lastContainer.id);
            console.log("Status:", lastContainer.status);
            console.log("Exit Code:", lastContainer.exitCode);
            console.log("Result Object:", lastContainer.resultObject);
            
            // Get container output
            console.log("\n📋 Fetching container output...");
            const containerOutput = await pbRequest(`/containers/fetch-output?id=${lastContainer.id}`);
            console.log("\n🔑 Container Output Keys:", Object.keys(containerOutput || {}));
            
            if (containerOutput.output) {
                const output = containerOutput.output;
                console.log("\nContainer output length:", output.length, "chars");
                console.log("\nSearching for result URLs in output...");
                
                const csvMatch = output.match(/CSV saved at (https:\/\/[^\s]+\.csv)/);
                const jsonMatch = output.match(/JSON saved at (https:\/\/[^\s]+\.json)/);
                
                if (csvMatch) {
                    console.log("✅ Found CSV URL:", csvMatch[1]);
                } else {
                    console.log("❌ No CSV URL found");
                }
                
                if (jsonMatch) {
                    console.log("✅ Found JSON URL:", jsonMatch[1]);
                } else {
                    console.log("❌ No JSON URL found");
                }
                
                console.log("\nLast 500 chars of output:");
                console.log(output.substring(output.length - 500));
            }
        } else {
            console.log("⚠️  No containers found for this agent");
        }

        console.log("\n" + "=".repeat(60) + "\n");

        // 4. Try to fetch agent's result object directly
        console.log("📋 STEP 4: Trying to fetch agent result object...");
        try {
            const resultObject = await pbRequest(`/agents/fetch-result-object?id=${PHANTOM_ID}&mode=track`);
            console.log("\n🔑 Result Object Keys:", Object.keys(resultObject || {}));
            console.log("\n📦 Result Object Response:");
            console.log(JSON.stringify(resultObject, null, 2));
            
            // If we got a URL, try to download it
            if (resultObject && resultObject.url) {
                console.log("\n✅ Found result object URL:", resultObject.url);
                console.log("📥 Attempting to download...");
                const fileResponse = await axios.get(resultObject.url, {
                    timeout: 30000,
                    responseType: resultObject.url.endsWith('.csv') ? 'text' : 'json'
                });
                
                if (typeof fileResponse.data === 'string') {
                    const lines = fileResponse.data.split('\n');
                    console.log(`✅ Downloaded CSV with ${lines.length} lines`);
                    console.log("First 3 lines:");
                    console.log(lines.slice(0, 3).join('\n'));
                } else {
                    const records = Array.isArray(fileResponse.data) ? fileResponse.data : [fileResponse.data];
                    console.log(`✅ Downloaded JSON with ${records.length} records`);
                    if (records.length > 0) {
                        console.log("First record keys:", Object.keys(records[0]));
                    }
                }
            }
        } catch (resultError) {
            console.log("❌ Failed to fetch result object:", resultError.message);
            if (resultError.response) {
                console.log("Response status:", resultError.response.status);
                console.log("Response data:", JSON.stringify(resultError.response.data, null, 2));
            }
        }

        console.log("\n" + "=".repeat(60) + "\n");

        // 5. Check common PhantomBuster result file locations
        console.log("📋 STEP 5: Checking common result file names...");
        const commonResultNames = [
            'result.csv',
            'result.json', 
            'database-linkedin-profile-scraper.csv',
            'linkedinProfileScraper.csv'
        ];
        
        for (const filename of commonResultNames) {
            try {
                // Try to construct a likely S3 URL pattern
                const testUrl = `https://phantombuster.s3.amazonaws.com/agent-${PHANTOM_ID}/${filename}`;
                console.log(`\n   Testing: ${filename}...`);
                const response = await axios.head(testUrl, { timeout: 5000 });
                console.log(`   ✅ Found file at: ${testUrl}`);
            } catch (e) {
                console.log(`   ❌ Not found: ${filename}`);
            }
        }

        console.log("\n" + "=".repeat(60) + "\n");
        console.log("✅ Debug complete!");
        
    } catch (error) {
        console.error("❌ Debug failed:", error.message);
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", error.response.data);
        }
    }
}

debugPhantomResponse();
