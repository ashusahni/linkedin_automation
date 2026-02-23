import axios from 'axios';
import fs from 'fs';

async function testStats() {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n';
    };

    try {
        log('--- Testing without filters ---');
        const res1 = await axios.get('http://localhost:5000/api/leads/review-stats');
        log(res1.data);

        log('\n--- Testing with quality=primary ---');
        const res2 = await axios.get('http://localhost:5000/api/leads/review-stats?quality=primary');
        log(res2.data);

        log('\n--- Testing with quality_score=primary ---');
        const res3 = await axios.get('http://localhost:5000/api/leads/review-stats?quality_score=primary');
        log(res3.data);

    } catch (error) {
        log('Error: ' + error.message);
        if (error.response) {
            log('Response data: ' + JSON.stringify(error.response.data));
        }
    } finally {
        fs.writeFileSync('test_output.txt', output);
    }
}

testStats();
