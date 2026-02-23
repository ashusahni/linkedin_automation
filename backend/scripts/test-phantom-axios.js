// backend/test-phantom-axios.js
// Alternative test using axios instead of undici

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testPhantomBusterAxios() {
    const API_KEY = process.env.PHANTOMBUSTER_API_KEY;
    const url = 'https://api.phantombuster.com/api/v2/agents/fetch-all';

    console.log('Testing PhantomBuster API with axios...');
    console.log('API Key present:', !!API_KEY);
    console.log('API Key (first 10 chars):', API_KEY?.substring(0, 10));
    console.log('');

    try {
        console.log('Attempting connection to:', url);

        const response = await axios.get(url, {
            headers: {
                'X-Phantombuster-Key': API_KEY,
                'User-Agent': 'NodeJS/LinkedIn-Reach'
            },
            timeout: 30000 // 30 second timeout
        });

        console.log('✅ Response status:', response.status);
        console.log('✅ Success! Found', response.data.length, 'phantoms');

        if (response.data.length > 0) {
            console.log('\\nYour Phantoms:');
            response.data.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.name} (ID: ${p.id})`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) console.error('❌ Error code:', error.code);
        if (error.response) {
            console.error('❌ Response status:', error.response.status);
            console.error('❌ Response data:', error.response.data);
        }
    }
}

testPhantomBusterAxios();
