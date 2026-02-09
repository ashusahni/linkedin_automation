/**
 * Debug script to check what arguments a PhantomBuster phantom accepts
 * Usage: node scripts/debug-phantom-args.js <PHANTOM_ID>
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Import the service - it's exported as a singleton
import phantomService from '../src/services/phantombuster.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const phantomId = process.argv[2] || process.env.LINKEDIN_OUTREACH_PHANTOM_ID || process.env.PHANTOM_MESSAGE_SENDER_ID;

if (!phantomId) {
  console.error('❌ Please provide a Phantom ID as argument or set LINKEDIN_OUTREACH_PHANTOM_ID in .env');
  console.log('\nUsage: node scripts/debug-phantom-args.js <PHANTOM_ID>');
  process.exit(1);
}

async function debugPhantom() {
  console.log(`\n🔍 Debugging Phantom: ${phantomId}\n`);
  console.log('='.repeat(60));

  // Check API key
  if (!process.env.PHANTOMBUSTER_API_KEY) {
    console.error('❌ PHANTOMBUSTER_API_KEY not set in .env file');
    process.exit(1);
  }
  console.log('✅ API Key found');

  try {
    // Fetch agent configuration directly using pbRequest
    console.log('\n📋 Fetching Agent Configuration...');
    const axios = (await import('axios')).default;
    const PB_API_URL = "https://api.phantombuster.com/api/v2";
    
    let agentConfig;
    try {
      const response = await axios.get(`${PB_API_URL}/agents/fetch`, {
        params: { id: phantomId },
        headers: {
          'X-Phantombuster-Key': process.env.PHANTOMBUSTER_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      agentConfig = response.data;
    } catch (fetchError) {
      console.error('❌ Error fetching agent configuration:');
      if (fetchError.response) {
        console.error('   Status:', fetchError.response.status);
        console.error('   Data:', JSON.stringify(fetchError.response.data, null, 2));
      } else {
        console.error('   Message:', fetchError.message);
      }
      throw fetchError;
    }
    
    // Handle different response formats
    let agent = agentConfig.agent || agentConfig;
    
    if (!agent) {
      console.error('❌ Could not parse agent configuration');
      console.error('   Response:', JSON.stringify(agentConfig, null, 2));
      return;
    }
    
    console.log('\n✅ Agent Information:');
    console.log(`   Name: ${agent.name || agentConfig.name || 'Unknown'}`);
    console.log(`   Script: ${agentConfig.script || agent.script || 'Unknown'}`);
    console.log(`   Script ID: ${agentConfig.scriptId || 'Unknown'}`);
    
    // Parse saved arguments
    let savedArgs = {};
    if (agentConfig.argument) {
      try {
        savedArgs = typeof agentConfig.argument === 'string' 
          ? JSON.parse(agentConfig.argument) 
          : agentConfig.argument;
      } catch (e) {
        console.log('   ⚠️  Could not parse saved arguments');
      }
    }

    // Show saved configuration
    console.log('\n⚙️  Saved Configuration (from dashboard):');
    if (Object.keys(savedArgs).length > 0) {
      for (const [key, value] of Object.entries(savedArgs)) {
        // Don't show sensitive data
        if (key.toLowerCase().includes('cookie') || key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
          console.log(`   - ${key}: [REDACTED - ${value ? 'SET' : 'NOT SET'}]`);
        } else {
          const displayValue = typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value;
          console.log(`   - ${key}: ${JSON.stringify(displayValue)}`);
        }
      }
    } else {
      console.log('   No saved arguments found');
    }

    // Check LinkedIn connection
    console.log('\n🔗 LinkedIn Connection:');
    const hasLinkedIn = savedArgs?.linkedinSessionCookie || 
                        savedArgs?.sessionCookie ||
                        savedArgs?.linkedInSessionCookie;
    if (hasLinkedIn) {
      console.log('   ✅ LinkedIn session cookie found in saved configuration');
    } else {
      console.log('   ⚠️  No LinkedIn session cookie in saved configuration');
      console.log('   💡 You may need to connect LinkedIn in the PhantomBuster dashboard');
    }

    // Recommendations based on script type
    console.log('\n💡 Recommendations:');
    const scriptName = (agentConfig.script || '').toLowerCase();
    const agentName = (agent.name || agentConfig.name || '').toLowerCase();
    
    if (scriptName.includes('message sender') || agentName.includes('message sender')) {
      console.log('   ✅ This is a "LinkedIn Message Sender" phantom');
      console.log('\n   📋 Expected Arguments (based on saved config):');
      console.log('   - spreadsheetUrl: URL to CSV with LinkedIn URLs and messages');
      console.log('   - message: Default message (if not in CSV)');
      console.log('   - messageColumnName: Column name in CSV for messages (default: "message")');
      console.log('   - profilesPerLaunch: Number of profiles to process (default: 5)');
      console.log('   - sessionCookie: LinkedIn session (may be rejected if sent via API)');
      console.log('\n   ⚠️  IMPORTANT: This phantom expects spreadsheetUrl, NOT linkedInUrl!');
      console.log('   - You need to provide a CSV URL with columns: LinkedIn URL, message');
      console.log('   - OR use the spreadsheetUrl parameter with your CSV endpoint');
    } else if (scriptName.includes('outreach') || agentName.includes('outreach')) {
      console.log('   - This appears to be a LinkedIn Outreach phantom');
      console.log('   - It likely uses dashboard LinkedIn connection (not API cookie)');
      console.log('   - Try sending: profileUrls, message (or messageText, yourMessage)');
      console.log('   - Do NOT send: sessionCookie, linkedinSessionCookie');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Debug complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

debugPhantom();
