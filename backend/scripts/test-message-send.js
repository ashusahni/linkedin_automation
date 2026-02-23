/**
 * Test script to verify message sending setup
 * This tests the spreadsheetUrl generation and CSV endpoint
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createToken, buildSpreadsheetOptions } from '../src/services/messageCsvStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testMessageSetup() {
  console.log('\n🧪 Testing Message Sending Setup\n');
  console.log('='.repeat(60));

  // Check BACKEND_PUBLIC_URL
  const backendUrl = process.env.BACKEND_PUBLIC_URL;
  console.log('\n1️⃣ Checking BACKEND_PUBLIC_URL...');
  if (!backendUrl) {
    console.error('   ❌ BACKEND_PUBLIC_URL not set in .env');
    console.log('   💡 Add: BACKEND_PUBLIC_URL=https://your-url.com');
    process.exit(1);
  }
  console.log(`   ✅ BACKEND_PUBLIC_URL: ${backendUrl}`);

  // Check if URL is valid
  try {
    const url = new URL(backendUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      console.error('   ⚠️  URL should start with http:// or https://');
    } else {
      console.log(`   ✅ URL format is valid (${url.protocol})`);
    }
  } catch (e) {
    console.error('   ❌ Invalid URL format');
    process.exit(1);
  }

  // Test token creation
  console.log('\n2️⃣ Testing token creation...');
  const testLinkedInUrl = 'https://linkedin.com/in/test-profile';
  const testMessage = 'Hi, this is a test message';
  const token = createToken(testLinkedInUrl, testMessage);
  console.log(`   ✅ Token created: ${token.substring(0, 30)}...`);

  // Test spreadsheetUrl generation
  console.log('\n3️⃣ Testing spreadsheetUrl generation...');
  const opts = buildSpreadsheetOptions(testLinkedInUrl, testMessage);
  if (!opts.spreadsheetUrl) {
    console.error('   ❌ buildSpreadsheetOptions returned no spreadsheetUrl');
    console.error('   💡 Check that BACKEND_PUBLIC_URL is set correctly');
    process.exit(1);
  }
  console.log(`   ✅ Spreadsheet URL generated:`);
  console.log(`      ${opts.spreadsheetUrl}`);

  // Test CSV endpoint (if server is running)
  console.log('\n4️⃣ Testing CSV endpoint accessibility...');
  console.log('   ⏳ Attempting to fetch CSV...');
  
  try {
    const response = await fetch(opts.spreadsheetUrl);
    if (response.ok) {
      const csv = await response.text();
      console.log('   ✅ CSV endpoint is accessible!');
      console.log(`   📄 CSV content:`);
      console.log(`      ${csv}`);
      
      // Verify CSV format
      if (csv.includes('LinkedInUrl') && csv.includes('Message')) {
        console.log('   ✅ CSV format is correct');
      } else {
        console.warn('   ⚠️  CSV format may be incorrect');
      }
    } else {
      console.error(`   ❌ CSV endpoint returned status: ${response.status}`);
      console.error('   💡 Make sure your backend server is running');
      console.error('   💡 Check that BACKEND_PUBLIC_URL points to your running server');
    }
  } catch (error) {
    console.error(`   ❌ Could not fetch CSV: ${error.message}`);
    console.error('   💡 Make sure your backend server is running');
    console.error('   💡 If using ngrok, ensure it\'s running and URL is correct');
    console.error('   💡 Check firewall/network settings');
  }

  // Check PhantomBuster configuration
  console.log('\n5️⃣ Checking PhantomBuster configuration...');
  const phantomId = process.env.PHANTOM_MESSAGE_SENDER_ID ||
                    process.env.LINKEDIN_MESSAGE_PHANTOM_ID ||
                    process.env.MESSAGE_SENDER_PHANTOM_ID ||
                    process.env.LINKEDIN_OUTREACH_PHANTOM_ID;
  
  if (phantomId) {
    console.log(`   ✅ Phantom ID found: ${phantomId}`);
  } else {
    console.warn('   ⚠️  No message sender phantom ID found');
    console.warn('   💡 Set PHANTOM_MESSAGE_SENDER_ID or LINKEDIN_OUTREACH_PHANTOM_ID in .env');
  }

  const apiKey = process.env.PHANTOMBUSTER_API_KEY;
  if (apiKey) {
    console.log(`   ✅ PhantomBuster API key found`);
  } else {
    console.error('   ❌ PHANTOMBUSTER_API_KEY not set');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');
  
  const allGood = backendUrl && opts.spreadsheetUrl && phantomId && apiKey;
  
  if (allGood) {
    console.log('✅ All checks passed! Message sending should work.');
    console.log('\n💡 Next steps:');
    console.log('   1. Ensure your backend server is running');
    console.log('   2. If using ngrok, keep it running');
    console.log('   3. Try sending a message from the app');
    console.log('   4. Check server logs for spreadsheetUrl generation');
  } else {
    console.log('⚠️  Some checks failed. Please fix the issues above.');
  }
  
  console.log('\n');
}

testMessageSetup().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
