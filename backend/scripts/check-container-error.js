/**
 * Check container error details
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import phantomService from '../src/services/phantombuster.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const containerId = process.argv[2];

if (!containerId) {
  console.error('Usage: node check-container-error.js <CONTAINER_ID>');
  console.error('Example: node check-container-error.js 6367262997386864');
  process.exit(1);
}

async function checkError() {
  console.log(`\n🔍 Checking Container Error: ${containerId}\n`);
  console.log('='.repeat(70));

  try {
    // Fetch container status
    console.log('1️⃣ Fetching container status...');
    const container = await phantomService.fetchContainerStatus(containerId);
    console.log('Status:', container.status);
    console.log('Exit Code:', container.exitCode);
    console.log('Exit Message:', container.exitMessage);

    // Fetch container output
    console.log('\n2️⃣ Fetching container output...');
    const output = await phantomService.fetchContainerOutput(containerId);
    
    if (output) {
      console.log('\n📋 Container Output:');
      console.log('='.repeat(70));
      console.log(output);
      console.log('='.repeat(70));
    } else {
      console.log('⚠️  No output found');
    }

    // Check for specific error patterns
    if (output) {
      console.log('\n3️⃣ Error Analysis:');
      
      if (output.includes('cookie-missing') || output.includes('RE: cookie-missing')) {
        console.log('   ❌ Cookie missing error detected');
        console.log('   The cookie may be expired or invalid');
      }
      
      if (output.includes('argument-invalid')) {
        console.log('   ❌ Invalid argument error detected');
        console.log('   One of the arguments sent is not accepted by the phantom');
      }
      
      if (output.includes('network-cookie-invalid')) {
        console.log('   ❌ Network cookie invalid error detected');
        console.log('   The cookie format or value is incorrect');
      }
      
      if (output.includes('spreadsheetUrl')) {
        console.log('   ⚠️  Spreadsheet URL related issue');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(70));
}

checkError().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
