// Test different ways to get phantom results
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const containerId = process.argv[2] || '3392066919951742';
const agentId = process.env.CONNECTIONS_EXPORT_PHANTOM_ID;
const API_KEY = process.env.PHANTOMBUSTER_API_KEY;

async function testResultFetching() {
    console.log('🔍 Testing different result fetching methods...');
    console.log('Container ID:', containerId);
    console.log('Agent ID:', agentId);
    console.log('');

    const headers = {
        'X-Phantombuster-Key': API_KEY,
        'User-Agent': 'NodeJS/LinkedIn-Reach'
    };

    // Method 1: Fetch container output
    console.log('📥 Method 1: Fetch container output');
    try {
        const url = `https://api.phantombuster.com/api/v2/containers/fetch-output?id=${containerId}`;
        console.log('URL:', url);
        const response = await axios.get(url, { headers, timeout: 30000 });
        console.log('✅ Success! Output length:', JSON.stringify(response.data).length);
        console.log('First 300 chars:', JSON.stringify(response.data).substring(0, 300));
        console.log('');
    } catch (error) {
        console.log('❌ Failed:', error.response?.status, error.response?.data || error.message);
        console.log('');
    }

    // Method 2: Fetch agent output (latest)
    console.log('📥 Method 2: Fetch agent output');
    try {
        const url = `https://api.phantombuster.com/api/v2/agents/fetch-output?id=${agentId}`;
        console.log('URL:', url);
        const response = await axios.get(url, { headers, timeout: 30000 });
        console.log('✅ Success! Output length:', JSON.stringify(response.data).length);
        console.log('First 300 chars:', JSON.stringify(response.data).substring(0, 300));
        console.log('');
    } catch (error) {
        console.log('❌ Failed:', error.response?.status, error.response?.data || error.message);
        console.log('');
    }

    // Method 3: Fetch agent result object
    console.log('📥 Method 3: Fetch agent details');
    try {
        const url = `https://api.phantombuster.com/api/v2/agents/fetch?id=${agentId}`;
        console.log('URL:', url);
        const response = await axios.get(url, { headers, timeout: 30000 });
        console.log('✅ Success!');
        console.log('Agent data:', JSON.stringify(response.data, null, 2));
        console.log('');
    } catch (error) {
        console.log('❌ Failed:', error.response?.status, error.response?.data || error.message);
        console.log('');
    }

    // Method 4: Fetch containers for agent
    console.log('📥 Method 4: Fetch containers for agent');
    try {
        const url = `https://api.phantombuster.com/api/v2/containers/fetch-all?agentId=${agentId}`;
        console.log('URL:', url);
        const response = await axios.get(url, { headers, timeout: 30000 });
        console.log('✅ Success! Found', response.data.length, 'containers');
        if (response.data.length > 0) {
            console.log('Latest container:', JSON.stringify(response.data[0], null, 2));
        }
        console.log('');
    } catch (error) {
        console.log('❌ Failed:', error.response?.status, error.response?.data || error.message);
        console.log('');
    }
}

testResultFetching();
