/**
 * Test message sending with detailed debugging
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import phantomService from '../src/services/phantombuster.service.js';
import { createToken, buildSpreadsheetOptions } from '../src/services/messageCsvStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testMessageSend() {
  console.log('\n🧪 Testing Message Send with Debugging\n');
  console.log('='.repeat(70));

  try {
    // Test profile
    const testProfile = {
      linkedin_url: 'https://www.linkedin.com/in/test-profile',
      id: 999
    };

    const testMessage = 'Test message from debug script';

    console.log('\n1️⃣ Setting up test data...');
    console.log(`   Profile: ${testProfile.linkedin_url}`);
    console.log(`   Message: ${testMessage}`);

    // Build spreadsheet options
    console.log('\n2️⃣ Building spreadsheet URL...');
    const spreadsheetOptions = buildSpreadsheetOptions(testProfile, testMessage);
    console.log(`   Spreadsheet URL: ${spreadsheetOptions.spreadsheetUrl}`);

    // Check if cookie is in dashboard
    console.log('\n3️⃣ Checking dashboard cookie...');
    const phantomId = process.env.PHANTOM_MESSAGE_SENDER_ID || '6916181421927761';
    const agentConfig = await phantomService.fetchAgent(phantomId);
    
    if (agentConfig?.argument) {
      let savedArgs = {};
      try {
        savedArgs = typeof agentConfig.argument === 'string' 
          ? JSON.parse(agentConfig.argument) 
          : agentConfig.argument;
        
        const dashboardCookie = savedArgs.sessionCookie || savedArgs.linkedinSessionCookie;
        if (dashboardCookie) {
          console.log(`   ✅ Cookie found in dashboard`);
          console.log(`   Cookie length: ${dashboardCookie.length}`);
          console.log(`   Cookie starts with: ${dashboardCookie.substring(0, 30)}...`);
          console.log(`   Cookie format: ${dashboardCookie.startsWith('li_at=') ? 'li_at=...' : 'raw value'}`);
        } else {
          console.log(`   ❌ No cookie found in dashboard`);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not parse: ${e.message}`);
      }
    }

    // Try sending message
    console.log('\n4️⃣ Attempting to send message...');
    console.log('   (This will show detailed logs of what arguments are sent)\n');
    
    try {
      const result = await phantomService.sendMessage(testProfile, testMessage, {
        spreadsheetUrl: spreadsheetOptions.spreadsheetUrl
      });
      
      console.log('\n✅ Message sent successfully!');
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('\n❌ Message send failed!');
      console.log('Error:', error.message);
      console.log('Error code:', error.code);
      console.log('Error details:', error.details);
      
      if (error.message.includes('cookie')) {
        console.log('\n🔍 Cookie-related error detected!');
        console.log('   This suggests the cookie format or value is incorrect.');
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(70));
}

testMessageSend().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
