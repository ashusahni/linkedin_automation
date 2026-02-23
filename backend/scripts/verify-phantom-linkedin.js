/**
 * Verify if LinkedIn is properly connected in PhantomBuster dashboard
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import phantomService from '../src/services/phantombuster.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const phantomId = process.env.PHANTOM_MESSAGE_SENDER_ID || '6916181421927761';

async function verify() {
  console.log('\n🔍 Verifying PhantomBuster LinkedIn Connection\n');
  console.log('='.repeat(60));

  try {
    const agentConfig = await phantomService.fetchAgent(phantomId);
    
    if (!agentConfig) {
      console.error('❌ Could not fetch phantom configuration');
      return;
    }

    console.log('\n📋 Phantom Information:');
    console.log(`   ID: ${phantomId}`);
    console.log(`   Name: ${agentConfig.name || 'Unknown'}`);
    console.log(`   Script: ${agentConfig.script || 'Unknown'}`);

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

    console.log('\n🔗 LinkedIn Connection Status:');
    
    // Check for cookie in saved config
    const hasCookieInConfig = savedArgs.sessionCookie || savedArgs.linkedinSessionCookie;
    if (hasCookieInConfig) {
      console.log('   ⚠️  Cookie found in saved configuration');
      console.log('   ⚠️  BUT: Having cookie saved ≠ LinkedIn is connected!');
    } else {
      console.log('   ❌ No cookie in saved configuration');
    }

    // Check for LinkedIn connection indicators
    const hasLinkedInConnection = agentConfig.linkedinAccountId || 
                                   agentConfig.linkedinAccount ||
                                   savedArgs.linkedinAccountId;

    if (hasLinkedInConnection) {
      console.log('   ✅ LinkedIn account ID found - LinkedIn appears to be connected');
    } else {
      console.log('   ❌ No LinkedIn account ID found');
      console.log('   ❌ LinkedIn is NOT actively connected in dashboard');
    }

    console.log('\n💡 What "cookie-missing" Error Means:');
    console.log('   The phantom needs an ACTIVE LinkedIn connection, not just a saved cookie.');
    console.log('   A saved cookie value does not mean LinkedIn is connected.\n');

    console.log('📝 Steps to Fix:');
    console.log('   1. Go to https://phantombuster.com/');
    console.log('   2. Open your Message Sender phantom');
    console.log('   3. Look for one of these sections:');
    console.log('      - "Connect to LinkedIn"');
    console.log('      - "LinkedIn Account"');
    console.log('      - "Authentication"');
    console.log('      - "LinkedIn Session"');
    console.log('   4. Click "Connect" or "Add Account"');
    console.log('   5. You will be redirected to LinkedIn to authorize');
    console.log('   6. After authorizing, return to PhantomBuster');
    console.log('   7. Verify it shows "Connected" with a green checkmark ✅');
    console.log('   8. Click "Save" to save the configuration');
    console.log('   9. The connection should now be active\n');

    console.log('⚠️  Important:');
    console.log('   - Just having a cookie value saved is NOT enough');
    console.log('   - You must go through the "Connect" flow');
    console.log('   - The phantom needs an active OAuth connection, not just a cookie string\n');

    console.log('='.repeat(60));
    console.log('\n✅ After connecting LinkedIn in dashboard, restart backend and try again.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verify();
