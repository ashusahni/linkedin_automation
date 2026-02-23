// backend/debug-container.js
// This script helps debug what PhantomBuster returns

import dotenv from 'dotenv';
import { fetch } from 'undici';

dotenv.config();

const API_KEY = process.env.PHANTOMBUSTER_API_KEY;
const PB_API_URL = "https://api.phantombuster.com/api/v2";

async function debugContainer(containerId) {
  console.log('🔍 Debugging Container:', containerId);
  console.log('');

  try {
    const url = `${PB_API_URL}/containers/fetch?id=${containerId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Phantombuster-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();

    console.log('📦 Full Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (data.container) {
      const c = data.container;
      console.log('📊 Container Details:');
      console.log('  - ID:', c.id);
      console.log('  - Status:', c.status);
      console.log('  - Exit Code:', c.exitCode);
      console.log('  - Exit Message:', c.exitMessage);
      console.log('  - Result Object:', c.resultObject);
      console.log('  - Created At:', c.createdAt);
      console.log('  - Launched At:', c.launchedAt);
      console.log('  - Finished At:', c.finishedAt);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get container ID from command line or use a test one
const containerId = process.argv[2];

if (!containerId) {
  console.log('Usage: node debug-container.js <containerId>');
  console.log('Example: node debug-container.js 12345678');
  process.exit(1);
}

debugContainer(containerId);
