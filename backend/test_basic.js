import fs from 'fs';
try {
    fs.writeFileSync('test_basic.txt', 'Hello World');
    console.log('File written');
} catch (e) {
    console.error(e);
}
