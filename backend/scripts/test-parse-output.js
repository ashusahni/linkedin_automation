// Parse the actual output data
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

dotenv.config();

const containerId = process.argv[2] || '3392066919951742';
const API_KEY = process.env.PHANTOMBUSTER_API_KEY;

async function parseOutput() {
    console.log('🔍 Fetching and parsing container output...');
    console.log('Container ID:', containerId);
    console.log('');

    try {
        const url = `https://api.phantombuster.com/api/v2/containers/fetch-output?id=${containerId}`;
        const response = await axios.get(url, {
            headers: {
                'X-Phantombuster-Key': API_KEY,
                'User-Agent': 'NodeJS/LinkedIn-Reach'
            },
            timeout: 30000
        });

        const data = response.data;
        console.log('✅ Data fetched successfully');
        console.log('Data type:', typeof data);
        console.log('Data keys:', Object.keys(data));
        console.log('');

        // Check if it has output field
        if (data.output) {
            console.log('📝 Output field found (console logs)');
            console.log('Output length:', data.output.length);
            console.log('');
        }

        // Check if it has resultObject or result
        if (data.resultObject) {
            console.log('📦 Result Object:', data.resultObject);
            console.log('');
        }

        // Check for CSV URL
        if (data.csvUrl) {
            console.log('📄 CSV URL:', data.csvUrl);
            console.log('');
        }

        // Look for any URL fields
        const urlFields = Object.keys(data).filter(key =>
            typeof data[key] === 'string' &&
            (data[key].includes('http') || data[key].includes('s3'))
        );

        if (urlFields.length > 0) {
            console.log('🔗 Found URL fields:', urlFields);
            urlFields.forEach(field => {
                console.log(`   ${field}:`, data[field]);
            });
            console.log('');
        }

        // Save full response to file for inspection
        fs.writeFileSync('container-output-full.json', JSON.stringify(data, null, 2));
        console.log('💾 Full output saved to: container-output-full.json');
        console.log('');

        // Try to find actual result data
        console.log('🔍 Looking for result data...');

        // Check all fields
        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
                console.log(`✅ Found array: ${key} with ${value.length} items`);
                if (value.length > 0) {
                    console.log('   First item:', JSON.stringify(value[0], null, 2).substring(0, 200));
                }
            } else if (typeof value === 'string' && value.startsWith('http')) {
                console.log(`🔗 Found URL: ${key} = ${value}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.status, error.response.data);
        }
    }
}

parseOutput();
