/**
 * Seed linkedin_industries table from linkedin_industry_code_v2_all_eng.json
 * Run: node scripts/seed_industries_from_json.js
 * Path: backend/src/config/linkedin_industry_code_v2_all_eng.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/db.js';
import { clearIndustryListCache } from '../src/services/industryList.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_PATH = path.resolve(__dirname, '../src/config/linkedin_industry_code_v2_all_eng.json');

function parseHierarchy(hierarchy) {
    if (!hierarchy || typeof hierarchy !== 'string') return { topLevel: null, subCategory: null };
    const parts = hierarchy.split('>').map((p) => p.trim()).filter(Boolean);
    return {
        topLevel: parts[0] || null,
        subCategory: parts.length >= 2 ? parts[1] : null,
    };
}

async function seed() {
    if (!fs.existsSync(JSON_PATH)) {
        console.error('❌ JSON not found:', JSON_PATH);
        process.exit(1);
    }

    const raw = fs.readFileSync(JSON_PATH, 'utf8');
    let list;
    try {
        list = JSON.parse(raw);
    } catch (e) {
        console.error('❌ Invalid JSON:', e.message);
        process.exit(1);
    }

    if (!Array.isArray(list)) {
        console.error('❌ JSON must be an array of industry objects');
        process.exit(1);
    }

    console.log('🔄 Seeding linkedin_industries from JSON...');
    console.log('📄 File:', JSON_PATH);
    console.log('📊 Records:', list.length);

    await pool.query('DELETE FROM linkedin_industries');
    console.log('🗑️  Cleared existing rows');

    let inserted = 0;
    for (const item of list) {
        const code = String(item.id ?? item.code ?? '').trim();
        const name = (item.label ?? item.name ?? '').trim();
        const hierarchy = (item.hierarchy ?? name ?? '').trim();
        const description = (item.description ?? '').trim() || null;
        const { topLevel, subCategory } = parseHierarchy(hierarchy);

        if (!code || !name) continue;

        await pool.query(
            `INSERT INTO linkedin_industries (code, name, hierarchy, description, top_level_industry, sub_category)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (code) DO UPDATE SET
               name = EXCLUDED.name,
               hierarchy = EXCLUDED.hierarchy,
               description = EXCLUDED.description,
               top_level_industry = EXCLUDED.top_level_industry,
               sub_category = EXCLUDED.sub_category,
               updated_at = CURRENT_TIMESTAMP`,
            [code, name, hierarchy, description, topLevel, subCategory]
        );
        inserted++;
    }

    const stats = await pool.query(`
        SELECT COUNT(*) AS total,
               COUNT(DISTINCT top_level_industry) AS top_level_count,
               COUNT(DISTINCT sub_category) AS sub_category_count
        FROM linkedin_industries
    `);
    const row = stats.rows[0];
    console.log('✅ Inserted/updated:', inserted);
    console.log('   Total rows:', row.total);
    console.log('   Top-level industries:', row.top_level_count);
    console.log('   Sub-categories:', row.sub_category_count);
    clearIndustryListCache();
    console.log('   Cache cleared for industry list.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
