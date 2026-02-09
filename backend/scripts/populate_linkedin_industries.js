/**
 * Script to populate LinkedIn industries table from CSV
 * Run this once to migrate data from CSV to database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import pool from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function populateIndustries() {
    try {
        console.log('🔄 Starting LinkedIn industries data migration...');

        // Path to CSV file (go up to linkedin-automation-engine3 folder)
        const csvPath = path.resolve(__dirname, '..', '..', 'linkedin_industry_code_v2_all_eng.csv');

        if (!fs.existsSync(csvPath)) {
            console.error('❌ CSV file not found at:', csvPath);
            process.exit(1);
        }

        console.log('📄 Reading CSV file:', csvPath);
        const fileContent = fs.readFileSync(csvPath, 'utf8');

        const records = parse(fileContent, {
            columns: ['code', 'name', 'hierarchy', 'description'],
            skip_empty_lines: true,
            trim: true,
        });

        console.log(`📊 Found ${records.length} industry records`);

        // Clear existing data
        await pool.query('DELETE FROM linkedin_industries');
        console.log('🗑️  Cleared existing data');

        // Insert records
        let inserted = 0;
        for (const rec of records) {
            const code = String(rec.code || '').trim();
            const name = (rec.name || '').trim();
            const hierarchy = (rec.hierarchy || rec.name || '').trim();
            const description = (rec.description || '').trim();

            if (!hierarchy || !code) continue;

            // Parse hierarchy to get top-level and sub-category
            const parts = hierarchy.split('>').map(p => p.trim()).filter(Boolean);
            const topLevel = parts[0] || null;
            const subCategory = parts.length >= 2 ? parts[1] : null;

            await pool.query(
                `INSERT INTO linkedin_industries 
         (code, name, hierarchy, description, top_level_industry, sub_category) 
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

        console.log(`✅ Successfully inserted ${inserted} industry records`);

        // Show some stats
        const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT top_level_industry) as top_level_count,
        COUNT(DISTINCT sub_category) as sub_category_count
      FROM linkedin_industries
    `);

        console.log('\n📈 Statistics:');
        console.log(`   Total records: ${stats.rows[0].total}`);
        console.log(`   Top-level industries: ${stats.rows[0].top_level_count}`);
        console.log(`   Sub-categories: ${stats.rows[0].sub_category_count}`);

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

populateIndustries();
