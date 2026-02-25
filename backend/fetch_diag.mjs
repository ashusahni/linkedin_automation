import fs from 'fs';
fetch('http://127.0.0.1:5000/diag')
    .then(r => r.text())
    .then(t => {
        fs.writeFileSync('diag_resp.json', t);
        process.exit(0);
    });
