// backend/test-phantom.js

import dotenv from 'dotenv';
import { fetch } from 'undici';

dotenv.config();

async function testPhantomBuster() {
  const API_KEY = process.env.PHANTOMBUSTER_API_KEY;
  const url = 'https://api.phantombuster.com/api/v2/agents/fetch-all';
  
  console.log('Testing PhantomBuster API...');
  console.log('API Key present:', !!API_KEY);
  console.log('API Key (first 10 chars):', API_KEY?.substring(0, 10));
  
  try {
    console.log('Attempting connection to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Phantombuster-Key': API_KEY,
        'User-Agent': 'NodeJS/LinkedIn-Reach'
      }
    });
    
    console.log('✅ Response status:', response.status);
    
    const data = await response.json();
    console.log('✅ Success! Found', data.length, 'phantoms');
    
    if (data.length > 0) {
      console.log('\nYour Phantoms:');
      data.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Full error:', error);
  }
}

testPhantomBuster();