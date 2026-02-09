// Run database migrations for contact scraper refactor
// Usage: node backend/database/run-migrations.js

import pool from '../src/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(migrationFile) {
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);

    console.log(`\n📄 ============================================`);
    console.log(`📄 Running: ${migrationFile}`);
    console.log(`📄 ============================================\n`);

    try {
        // Read migration file
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration
        await pool.query(sql);

        console.log(`✅ Successfully applied: ${migrationFile}\n`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to apply: ${migrationFile}`);
        console.error(`Error: ${error.message}\n`);
        return false;
    }
}

async function runAllMigrations() {
    console.log(`\n🚀 ============================================`);
    console.log(`🚀 CONTACT SCRAPER MIGRATIONS`);
    console.log(`🚀 ============================================\n`);

    const migrations = [
        '018_add_profile_id_and_scraper_cache.sql',
        '019_create_scraping_jobs.sql'
    ];

    let successCount = 0;
    let failCount = 0;

    for (const migration of migrations) {
        const success = await runMigration(migration);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log(`\n📊 ============================================`);
    console.log(`📊 MIGRATION SUMMARY`);
    console.log(`📊 ============================================`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📝 Total: ${migrations.length}\n`);

    // Verify migrations
    if (successCount === migrations.length) {
        console.log(`🔍 Verifying migrations...\n`);
        await verifyMigrations();
    }

    // Close pool
    await pool.end();

    if (failCount > 0) {
        process.exit(1);
    }
}

async function verifyMigrations() {
    try {
        // Check if tables exist
        const tablesCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name IN ('scraped_contacts', 'scraping_jobs')
            ORDER BY table_name
        `);

        console.log(`📋 Tables created:`);
        for (const row of tablesCheck.rows) {
            console.log(`   ✅ ${row.table_name}`);
        }

        // Check if linkedin_profile_id column exists
        const columnCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'leads' 
              AND column_name = 'linkedin_profile_id'
        `);

        if (columnCheck.rows.length > 0) {
            console.log(`   ✅ leads.linkedin_profile_id column added`);
        }

        // Check profile ID backfill
        const profileIdCount = await pool.query(`
            SELECT COUNT(*) as count 
            FROM leads 
            WHERE linkedin_profile_id IS NOT NULL
        `);

        console.log(`   ✅ Profile IDs backfilled: ${profileIdCount.rows[0].count} leads`);

        // Check helper functions
        const functionsCheck = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
              AND routine_name IN ('get_active_scraping_progress', 'get_scraping_stats', 'sync_contacts_to_leads')
            ORDER BY routine_name
        `);

        console.log(`\n📋 Functions created:`);
        for (const row of functionsCheck.rows) {
            console.log(`   ✅ ${row.routine_name}()`);
        }

        // Check triggers
        const triggersCheck = await pool.query(`
            SELECT trigger_name 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public' 
              AND trigger_name IN ('trigger_sync_contacts_to_leads', 'trigger_update_scraping_jobs_updated_at')
            ORDER BY trigger_name
        `);

        console.log(`\n📋 Triggers created:`);
        for (const row of triggersCheck.rows) {
            console.log(`   ✅ ${row.trigger_name}`);
        }

        console.log(`\n✅ All migrations verified successfully!\n`);

    } catch (error) {
        console.error(`\n⚠️  Verification failed: ${error.message}\n`);
    }
}

// Run migrations
runAllMigrations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
