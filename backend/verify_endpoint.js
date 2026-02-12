const http = require('http');

console.log('Sending request to http://localhost:5000/api/leads/review-stats?quality=Primary');

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/leads/review-stats?quality=Primary',
    method: 'GET',
    timeout: 5000 // 5 seconds timeout
};

const req = http.request(options, (res) => {
    console.log(`Response received with status code: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const parsedData = JSON.parse(data);
            console.log('Status Code:', res.statusCode);
            console.log('Response Body:', JSON.stringify(parsedData, null, 2));

            if (res.statusCode === 200 && parsedData.reviewStats) {
                console.log('✅ Endpoint verification successful!');
                console.log('Stats:', parsedData.reviewStats);
            } else {
                console.error('❌ Endpoint verification failed!');
            }
        } catch (e) {
            console.error('❌ Error parsing JSON response:', e.message);
            console.log('Raw Data:', data);
        }
    });
});

req.on('timeout', () => {
    console.error('❌ Request timed out after 5000ms');
    req.destroy();
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.end();
