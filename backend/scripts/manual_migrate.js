
import { runMigrations } from '../src/db/migrations.js';
import '../src/config/index.js'; // Ensure config is loaded (dotenv)

console.log('Starting manual migration...');
runMigrations()
    .then(() => {
        console.log('Manual migration finished successfully.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Manual migration failed:', err);
        process.exit(1);
    });
