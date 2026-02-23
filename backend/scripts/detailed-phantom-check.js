/**
 * Detailed PhantomBuster Phantom Check
 * Checks agent configuration, saved arguments, and connection status
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import phantomService from '../src/services/phantombuster.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const phantomId = process.env.PHANTOM_MESSAGE_SENDER_ID || '6916181421927761';

async function detailedCheck() {
  console.log('\n🔍 Detailed PhantomBuster Phantom Check\n');
  console.log('='.repeat(70));

  try {
    // Fetch agent configuration
    console.log('\n1️⃣ Fetching Agent Configuration...');
    const agentConfig = await phantomService.fetchAgent(phantomId);
    
    if (!agentConfig) {
      console.error('❌ Could not fetch agent configuration');
      return;
    }

    console.log('\n📋 Agent Details:');
    console.log(`   ID: ${phantomId}`);
    console.log(`   Name: ${agentConfig.name || agentConfig.agent?.name || 'Unknown'}`);
    console.log(`   Script: ${agentConfig.script || agentConfig.agent?.script || 'Unknown'}`);
    console.log(`   Type: ${agentConfig.agentType || agentConfig.agent?.agentType || 'Unknown'}`);

    // Check saved arguments
    console.log('\n2️⃣ Saved Configuration (Arguments):');
    let savedArgs = {};
    if (agentConfig.argument) {
      try {
        savedArgs = typeof agentConfig.argument === 'string' 
          ? JSON.parse(agentConfig.argument) 
          : agentConfig.argument;
        console.log('   ✅ Saved arguments found');
        console.log('   Saved arguments keys:', Object.keys(savedArgs).join(', '));
        
        // Check for session cookie
        if (savedArgs.sessionCookie || savedArgs.linkedinSessionCookie) {
          const cookie = savedArgs.sessionCookie || savedArgs.linkedinSessionCookie;
          console.log('   ✅ Cookie found in saved config');
          console.log(`   Cookie length: ${cookie.length} characters`);
          console.log(`   Cookie starts with: ${cookie.substring(0, 20)}...`);
        } else {
          console.log('   ❌ No cookie in saved config');
        }
      } catch (e) {
        console.log('   ⚠️  Could not parse saved arguments:', e.message);
        console.log('   Raw argument:', agentConfig.argument);
      }
    } else {
      console.log('   ⚠️  No saved arguments found');
    }

    // Check for LinkedIn connection indicators
    console.log('\n3️⃣ LinkedIn Connection Status:');
    
    const hasLinkedInAccountId = agentConfig.linkedinAccountId || 
                                 agentConfig.linkedinAccount ||
                                 agentConfig.agent?.linkedinAccountId ||
                                 savedArgs.linkedinAccountId;
    
    const hasLinkedInConnection = agentConfig.linkedinConnection ||
                                 agentConfig.agent?.linkedinConnection ||
                                 savedArgs.linkedinConnection;

    if (hasLinkedInAccountId) {
      console.log('   ✅ LinkedIn account ID found:', hasLinkedInAccountId);
      console.log('   ✅ LinkedIn appears to be connected via OAuth');
    } else {
      console.log('   ❌ No LinkedIn account ID found');
    }

    if (hasLinkedInConnection) {
      console.log('   ✅ LinkedIn connection object found');
      console.log('   Connection:', JSON.stringify(hasLinkedInConnection, null, 2));
    }

    // Check agent's accepted arguments
    console.log('\n4️⃣ Agent Accepted Arguments:');
    const acceptedArgs = agentConfig.agent?.arguments || agentConfig.arguments || {};
    if (Object.keys(acceptedArgs).length > 0) {
      console.log('   Accepted arguments:');
      for (const [key, value] of Object.entries(acceptedArgs)) {
        const required = value.required ? ' (REQUIRED)' : '';
        const type = value.type || 'unknown';
        console.log(`   - ${key}: ${type}${required}`);
      }
      
      // Check if sessionCookie is an accepted argument
      if (acceptedArgs.sessionCookie || acceptedArgs.linkedinSessionCookie) {
        console.log('\n   ⚠️  IMPORTANT: This phantom accepts sessionCookie as an argument!');
        console.log('   This means you CAN send cookie via API if OAuth connection fails.');
      }
    } else {
      console.log('   ⚠️  No accepted arguments found in agent config');
    }

    // Full agent config dump
    console.log('\n5️⃣ Full Agent Configuration (for debugging):');
    console.log(JSON.stringify(agentConfig, null, 2));

    // Recommendations
    console.log('\n6️⃣ Recommendations:\n');
    
    if (!hasLinkedInAccountId && !hasLinkedInConnection) {
      console.log('   ❌ LinkedIn is NOT connected via OAuth');
      console.log('   You need to connect LinkedIn in the dashboard.\n');
      
      if (savedArgs.sessionCookie || savedArgs.linkedinSessionCookie) {
        console.log('   💡 ALTERNATIVE SOLUTION:');
        console.log('   Since this phantom accepts sessionCookie as an argument,');
        console.log('   you can send the cookie via API instead of OAuth.\n');
        console.log('   To do this:');
        console.log('   1. Get a fresh LinkedIn cookie from your browser');
        console.log('   2. Update .env: LINKEDIN_SESSION_COOKIE=<cookie_value>');
        console.log('   3. Modify code to send sessionCookie for this phantom');
        console.log('   4. This bypasses the need for OAuth connection\n');
      }
    } else {
      console.log('   ✅ LinkedIn appears to be connected');
      console.log('   If you\'re still getting errors, try:');
      console.log('   1. Disconnect and reconnect LinkedIn in dashboard');
      console.log('   2. Make sure you clicked "Save" after connecting');
      console.log('   3. Wait a few minutes for connection to sync');
    }

  } catch (err) {
    console.error('\n❌ Error during check:', err.message);
    console.error(err.stack);
  }

  console.log('\n' + '='.repeat(70));
}

detailedCheck().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
