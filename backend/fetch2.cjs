const http = require('http');
const fs = require('fs');
http.get('http://127.0.0.1:5000/diag', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => fs.writeFileSync('diag_resp.js', data));
});
