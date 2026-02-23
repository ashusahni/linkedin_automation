// Test container status fetch
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const containerId = process.argv[2] || '3392066919951742';
const API_KEY = process.env.PHANTOMBUSTER_API_KEY;

async function testContainerFetch() {
    const url = `https://api.phantombuster.com/api/v2/containers/fetch?id=${containerId}`;

    console.log('🔍 Testing container fetch...');
    console.log('Container ID:', containerId);
    console.log('API Key present:', !!API_KEY);
    console.log('URL:', url);
    console.log('');

    try {
        const response = await axios.get(url, {
            headers: {
                'X-Phantombuster-Key': API_KEY,
                'User-Agent': 'NodeJS/LinkedIn-Reach'
            },
            timeout: 30000
        });

        console.log('✅ Success!');
        console.log('Status:', response.status);
        console.log('');
        console.log('Container Data:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Error occurred!');
        console.error('');

        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Status Text:', error.response.statusText);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received');
            console.error('Error Code:', error.code);
            console.error('Error Message:', error.message);
        } else {
            console.error('Request setup error');
            console.error('Error Message:', error.message);
        }
    }
}

testContainerFetch();
