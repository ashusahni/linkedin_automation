import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = process.env.VITE_API_URL || 'http://localhost:5000';

async function triggerFetch() {
    try {
        console.log(`Triggering content fetch at ${API_URL}/api/sow/content/fetch...`);
        const res = await axios.post(`${API_URL}/api/sow/content/fetch`);
        console.log('✅ Response status:', res.status);
        console.log('📝 Response data:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('❌ Failed to trigger fetch:', err.message);
        if (err.response) {
            console.error('  Response status:', err.response.status);
            console.error('  Response data:', JSON.stringify(err.response.data));
        }
    }
}

triggerFetch();
