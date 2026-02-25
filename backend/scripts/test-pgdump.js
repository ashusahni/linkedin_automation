import { execSync } from 'child_process';

try {
    const output = execSync('pg_dump --version', { encoding: 'utf-8' });
    console.log("PG_DUMP VERSION:", output);
} catch (error) {
    console.error("PG_DUMP NOT FOUND or ERROR:", error.message);
}
