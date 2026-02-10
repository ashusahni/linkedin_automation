import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = process.env.VITE_API_URL || 'http://localhost:5000';

async function checkAnalytics() {
    try {
        console.log(`Checking analytics API at ${API_URL}/api/analytics/dashboard...`);
        const res = await axios.get(`${API_URL}/api/analytics/dashboard?period=monthly`);
        console.log('✅ Response status:', res.status);
        console.log('📊 Dashboard Data Summary:');
        console.log('  Period:', res.data.period);
        console.log('  Lead Scraping:');
        console.log('    Total Leads:', res.data.leadScraping?.totalLeads);
        console.log('    Industry Distribution:', res.data.leadScraping?.industryDistribution?.length, 'industries');
        console.log('    Lead Quality:', JSON.stringify(res.data.leadScraping?.leadQuality));
        console.log('  Campaign Analytics:');
        console.log('    Status Overview:', JSON.stringify(res.data.campaignAnalytics?.statusOverview));
        console.log('    Messaging Stats:', JSON.stringify(res.data.campaignAnalytics?.messaging));
    } catch (err) {
        console.error('❌ Failed to fetch analytics:', err.message);
        if (err.response) {
            console.error('  Response status:', err.response.status);
            console.error('  Response data:', JSON.stringify(err.response.data));
        }
    }
}

checkAnalytics();
