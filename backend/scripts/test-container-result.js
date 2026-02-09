// Test container with result object
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const containerId = process.argv[2] || '3392066919951742';
const API_KEY = process.env.PHANTOMBUSTER_API_KEY;

async function testContainerWithResult() {
    console.log('🔍 Testing container fetch with result object...');
    console.log('Container ID:', containerId);
    console.log('');

    try {
        // Fetch container status
        const containerUrl = `https://api.phantombuster.com/api/v2/containers/fetch?id=${containerId}`;
        const containerResponse = await axios.get(containerUrl, {
            headers: {
                'X-Phantombuster-Key': API_KEY,
                'User-Agent': 'NodeJS/LinkedIn-Reach'
            },
            timeout: 30000
        });

        console.log('✅ Container Data:');
        console.log(JSON.stringify(containerResponse.data, null, 2));
        console.log('');

        const container = containerResponse.data;

        // Check for result object
        if (container.resultObject) {
            console.log('📦 Result Object ID:', container.resultObject);
            console.log('');

            // Try to fetch result object
            console.log('🔍 Fetching result object...');
            const resultUrl = `https://api.phantombuster.com/api/v2/containers/fetch-output?id=${containerId}`;

            try {
                const resultResponse = await axios.get(resultUrl, {
                    headers: {
                        'X-Phantombuster-Key': API_KEY,
                        'User-Agent': 'NodeJS/LinkedIn-Reach'
                    },
                    timeout: 30000
                });

                console.log('✅ Result Data (first 500 chars):');
                const resultStr = JSON.stringify(resultResponse.data, null, 2);
                console.log(resultStr.substring(0, 500));
                console.log('...');
                console.log('');
                console.log('Total result length:', resultStr.length);

            } catch (err) {
                console.log('⚠️ Could not fetch result via fetch-output endpoint');
                console.log('Error:', err.message);
            }
        } else {
            console.log('⚠️ No resultObject found in container');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testContainerWithResult();
