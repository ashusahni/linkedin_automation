
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple implementation to avoid complex dependencies if needed, 
// or I can import the service if it's clean enough.
// Let's try importing the service first.
import phantomService from '../src/services/phantombuster.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const phantomId = '815699719041593';

async function main() {
  console.log(`\n🔍 Fetching configuration for Phantom ID: ${phantomId}`);
  try {
    // We need to make sure the service has the API key from .env
    // dotenv/config handles loading .env into process.env if it's in root.
    // My script is in backend/scripts/, .env is in backend/.
    // dotenv usually looks in current working directory.

    if (!process.env.PHANTOMBUSTER_API_KEY) {
      // Try to load manually if not present
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
          const [key, val] = line.split('=');
          if (key && val) process.env[key.trim()] = val.trim();
        });
      }
    }

    console.log("API Key present:", !!process.env.PHANTOMBUSTER_API_KEY);

    const agent = await phantomService.fetchAgent(phantomId);
    if (!agent) {
      console.error("❌ Failed to fetch agent (null returned).");
      return;
    }

    console.log("\n✅ Agent Info:");
    console.log("Name:", agent.name);
    console.log("ID:", agent.id);

    // Detailed properties
    console.log("\n📋 Full Config Object (truncated):");
    console.log(JSON.stringify(agent, null, 2));

    // Also fetch metadata if available?
    // Let's look specifically for 'manifest' or 'argument' structure

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

main();
