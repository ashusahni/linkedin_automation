import pool from './src/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
    const sql = await fs.readFile(path.join(__dirname, 'database/migrations/023_content_engine_v2.sql'), 'utf8');
    try {
        await pool.query(sql);
        console.log('✅ Migration 023_content_engine_v2 applied successfully!');
    } catch (e) {
        console.error('❌ Migration error:', e.message);
    }
    await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
