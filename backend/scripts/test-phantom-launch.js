/**
 * Test launching the phantom directly with different argument combinations
 * to find what works
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.PHANTOMBUSTER_API_KEY;
const PHANTOM_ID = process.env.PHANTOM_MESSAGE_SENDER_ID || '6916181421927761';
const PB_API_URL = 'https://api.phantombuster.com/api/v2';

async function testLaunch(testName, args) {
  console.log(`\n🧪 Test: ${testName}`);
  console.log('Arguments:', JSON.stringify(args, null, 2));
  
  try {
    const body = Object.keys(args).length > 0 
      ? { id: PHANTOM_ID, arguments: args }
      : { id: PHANTOM_ID };
    
    const response = await axios.post(
      `${PB_API_URL}/agents/launch`,
      body,
      {
        headers: {
          'X-Phantombuster-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Launch successful!');
    console.log('Container ID:', response.data.containerId);
    return response.data.containerId;
  } catch (error) {
    if (error.response) {
      console.error('❌ Launch failed:');
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Error:', error.message);
    }
    return null;
  }
}

async function checkContainer(containerId) {
  if (!containerId) return;
  
  console.log(`\n⏳ Checking container ${containerId}...`);
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  
  try {
    const response = await axios.get(
      `${PB_API_URL}/containers/fetch`,
      {
        params: { id: containerId },
        headers: {
          'X-Phantombuster-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const container = response.data;
    console.log('Status:', container.status);
    console.log('Exit Code:', container.exitCode);
    if (container.exitMessage) {
      console.log('Exit Message:', container.exitMessage);
    }
    if (container.output) {
      const outputLines = container.output.split('\n').slice(-5);
      console.log('Last 5 lines of output:');
      outputLines.forEach(line => console.log('  ', line));
    }
  } catch (error) {
    console.error('Error checking container:', error.message);
  }
}

async function runTests() {
  console.log('\n🔬 Testing PhantomBuster Launch with Different Configurations\n');
  console.log('='.repeat(60));
  console.log(`Phantom ID: ${PHANTOM_ID}`);
  console.log(`API Key: ${API_KEY ? 'Set' : 'NOT SET'}`);
  console.log('='.repeat(60));

  if (!API_KEY) {
    console.error('❌ PHANTOMBUSTER_API_KEY not set');
    process.exit(1);
  }

  // Test 1: No arguments at all (like Search Export)
  const containerId1 = await testLaunch('Test 1: No arguments (dashboard config only)', {});
  await checkContainer(containerId1);

  // Test 2: Only spreadsheetUrl (minimal args)
  const testSpreadsheetUrl = 'https://example.com/test.csv';
  const containerId2 = await testLaunch('Test 2: Only spreadsheetUrl', {
    spreadsheetUrl: testSpreadsheetUrl
  });
  await checkContainer(containerId2);

  // Test 3: spreadsheetUrl + message
  const containerId3 = await testLaunch('Test 3: spreadsheetUrl + message', {
    spreadsheetUrl: testSpreadsheetUrl,
    message: 'Test message'
  });
  await checkContainer(containerId3);

  // Test 4: Full args (what we're currently sending)
  const containerId4 = await testLaunch('Test 4: Full args (current config)', {
    spreadsheetUrl: testSpreadsheetUrl,
    message: 'Test message',
    messageColumnName: 'message',
    profilesPerLaunch: 1
  });
  await checkContainer(containerId4);

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log('Check which test succeeded (no cookie-missing error)');
  console.log('That will tell us the correct argument format.\n');
}

runTests().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
