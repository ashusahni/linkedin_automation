
import axios from "axios";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Get API Key
// Try to load .env manually if not in process.env (since we're running script cleanly)
const envPath = path.resolve(__dirname, "../.env");
let apiKey = process.env.PHANTOMBUSTER_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/PHANTOMBUSTER_API_KEY=(.+)/);
    if (match) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error("❌ Could not find PHANTOMBUSTER_API_KEY in .env");
    process.exit(1);
}

const phantomId = "815699719041593";
const PB_API_URL = "https://api.phantombuster.com/api/v2";

async function run() {
    console.log(`🔍 Inspecting Phantom ID: ${phantomId}`);
    try {
        const response = await axios.get(`${PB_API_URL}/agents/fetch?id=${phantomId}`, {
            headers: { "X-Phantombuster-Key": apiKey }
        });

        const agent = response.data;
        if (!agent) {
            console.error("❌ Agent not found");
            return;
        }

        console.log(`✅ Agent Found: ${agent.name}`);
        console.log(`   Script: ${agent.scriptName}`);
        console.log(`   AWS S3 Folder: ${agent.s3Folder}`);

        console.log("\n📋 SAVED ARGUMENT (Default Config):");
        try {
            const args = typeof agent.argument === 'string' ? JSON.parse(agent.argument) : agent.argument;
            console.log(JSON.stringify(args, null, 2));
        } catch (e) {
            console.log("   (Raw string):", agent.argument);
        }

        // Try to guess the phantom type or see manifest parameters if available
        // Unfortunately standard fetch doesn't give manifest directly usually, but let's check other props

    } catch (error) {
        console.error("❌ Error fetching agent:", error.response?.data || error.message);
    }
}

run();
