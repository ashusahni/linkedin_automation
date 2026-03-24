const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/preferences/rescore',
  method: 'POST'
};
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => process.stdout.write(d));
});
req.on('error', (e) => console.error(e.message));
req.end();
