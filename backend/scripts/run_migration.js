import fs from 'fs';
import path from 'path';
import pool from '../src/db.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
        console.error("Please provide a migration file path.");
        process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), migrationFile);
    console.log(`Reading migration file: ${filePath}`);

    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log("Executing SQL...");
        await pool.query(sql);
        console.log("Migration executed successfully!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

runMigration();
