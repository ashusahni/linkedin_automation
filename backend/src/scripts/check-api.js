import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const API_KEY = process.env.PHANTOMBUSTER_API_KEY;
const API_URL = "https://api.phantombuster.com/api/v2";

async function checkApiKey() {
    console.log("\n🔍 Checking PhantomBuster API Key...");
    console.log("-----------------------------------------");

    if (!API_KEY) {
        console.error("❌ ERROR: PHANTOMBUSTER_API_KEY not found in .env file.");
        return;
    }

    console.log(`🔑 Key found: ${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}`);

    try {
        const response = await axios.get(`${API_URL}/agents/fetch-all`, {
            headers: {
                "X-Phantombuster-Key": API_KEY,
                "Content-Type": "application/json"
            }
        });

        console.log("✅ SUCCESS: API Key is working correctly!");

        if (Array.isArray(response.data)) {
            console.log(`📊 Found ${response.data.length} Phantoms in your account.`);

            // Check if our specific IDs exist (Lead Search uses SEARCH_EXPORT or SEARCH_LEADS)
            const idsToCheck = [
                { env: "CONNECTIONS_EXPORT_PHANTOM_ID", id: process.env.CONNECTIONS_EXPORT_PHANTOM_ID },
                { env: "SEARCH_EXPORT_PHANTOM_ID (Lead Search)", id: process.env.SEARCH_EXPORT_PHANTOM_ID || process.env.SEARCH_LEADS_PHANTOM_ID },
                { env: "PROFILE_SCRAPER_PHANTOM_ID", id: process.env.PROFILE_SCRAPER_PHANTOM_ID },
                { env: "MESSAGE_SENDER_PHANTOM_ID (LinkedIn Message Sender)", id: process.env.MESSAGE_SENDER_PHANTOM_ID || process.env.LINKEDIN_MESSAGE_PHANTOM_ID || process.env.PHANTOM_MESSAGE_SENDER_ID }
            ];

            console.log("\n🕵️ Checking configured Phantom IDs:");
            idsToCheck.forEach(({ env, id }) => {
                if (!id) {
                    console.log(`   ⚠️ ${env}: not set in .env`);
                    return;
                }
                const found = response.data.find(agent => agent.id === id);
                if (found) {
                    console.log(`   ✅ ${env}: Found (${found.name})`);
                } else {
                    console.log(`   ❌ ${env}: ID ${id} NOT FOUND in your account.`);
                }
            });
        }
    } catch (error) {
        if (error.response) {
            console.error(`❌ API ERROR: ${error.response.status} - ${error.response.statusText}`);
            console.error(`   Message: ${JSON.stringify(error.response.data)}`);
            if (error.response.status === 401) {
                console.error("\n💡 TIP: Your API key appears to be INVALID. Please check it in the PhantomBuster dashboard.");
            }
        } else {
            console.error(`❌ REQUEST ERROR: ${error.message}`);
        }
    }
    console.log("-----------------------------------------\n");
}

checkApiKey();
