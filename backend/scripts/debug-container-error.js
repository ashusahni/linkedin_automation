/**
 * Debug a specific container to see the exact error
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_KEY = process.env.PHANTOMBUSTER_API_KEY;
const PB_API_URL = 'https://api.phantombuster.com/api/v2';

// Get container ID from command line or use latest failed one
const containerId = process.argv[2];

if (!containerId) {
  console.error('Usage: node scripts/debug-container-error.js <CONTAINER_ID>');
  console.error('\nExample: node scripts/debug-container-error.js 2367569351743226');
  process.exit(1);
}

async function debugContainer() {
  console.log(`\n🔍 Debugging Container: ${containerId}\n`);
  console.log('='.repeat(60));

  try {
    // Fetch container details
    const containerResponse = await axios.get(
      `${PB_API_URL}/containers/fetch`,
      {
        params: { id: containerId },
        headers: {
          'X-Phantombuster-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const container = containerResponse.data;
    
    console.log('\n📦 Container Details:');
    console.log(`   ID: ${container.id}`);
    console.log(`   Status: ${container.status}`);
    console.log(`   Exit Code: ${container.exitCode}`);
    console.log(`   Created: ${new Date(container.createdAt).toLocaleString()}`);
    if (container.finishedAt) {
      console.log(`   Finished: ${new Date(container.finishedAt).toLocaleString()}`);
    }

    // Get full output
    try {
      const outputResponse = await axios.get(
        `${PB_API_URL}/containers/fetch-output`,
        {
          params: { id: containerId },
          headers: {
            'X-Phantombuster-Key': API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const output = outputResponse.data?.output || '';
      
      console.log('\n📋 Full Container Output:');
      console.log('='.repeat(60));
      if (output) {
        // Show last 50 lines
        const lines = output.split('\n');
        const lastLines = lines.slice(-50);
        lastLines.forEach(line => console.log(line));
      } else {
        console.log('(No output available)');
      }
      console.log('='.repeat(60));

      // Extract error patterns
      console.log('\n🔍 Error Analysis:');
      const errorPatterns = [
        /cookie-missing/i,
        /network-cookie-invalid/i,
        /argument-invalid/i,
        /linkedin.*not.*connected/i,
        /authentication.*failed/i,
        /session.*expired/i
      ];

      for (const pattern of errorPatterns) {
        if (pattern.test(output)) {
          const matches = output.match(new RegExp(`.*${pattern.source}.*`, 'gi'));
          if (matches) {
            console.log(`\n   Found: ${pattern.source}`);
            matches.slice(0, 3).forEach(match => console.log(`     ${match.trim()}`));
          }
        }
      }

    } catch (outputErr) {
      console.error('Could not fetch output:', outputErr.message);
    }

    // Check what arguments were sent
    if (container.arguments) {
      console.log('\n📤 Arguments Sent to Phantom:');
      console.log(JSON.stringify(container.arguments, null, 2));
      
      // Check if cookie was sent
      if (container.arguments.sessionCookie) {
        console.log('\n⚠️  Cookie was sent via API');
        console.log('   This might conflict with dashboard connection');
      } else {
        console.log('\n✅ No cookie sent via API (using dashboard connection)');
      }
    }

    console.log('\n💡 Recommendations:');
    if (output.includes('cookie-missing')) {
      console.log('   1. Go to PhantomBuster dashboard');
      console.log('   2. Open your Message Sender phantom');
      console.log('   3. Click "Connect to LinkedIn"');
      console.log('   4. Complete the OAuth flow');
      console.log('   5. Verify it shows "Connected" ✅');
      console.log('   6. Save configuration');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugContainer();
